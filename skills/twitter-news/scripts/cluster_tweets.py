#!/usr/bin/env python3
"""
Cluster tweets by topic for news aggregation.
Uses semantic similarity, named entity matching, and temporal proximity.
"""

import argparse
import json
import re
from collections import defaultdict
from datetime import datetime
from typing import List, Dict, Any

def extract_entities(text: str) -> set:
    """Extract simple named entities (capitalized words, @handles, URLs)."""
    entities = set()
    # @ mentions
    entities.update(re.findall(r'@(\w+)', text))
    # URLs
    entities.update(re.findall(r'https?://[^\s]+', text))
    # Capitalized words (likely proper nouns)
    entities.update(re.findall(r'\b[A-Z][a-zA-Z]+\b', text))
    return entities

def jaccard_similarity(set1: set, set2: set) -> float:
    """Calculate Jaccard similarity between two sets."""
    if not set1 and not set2:
        return 0.0
    intersection = len(set1 & set2)
    union = len(set1 | set2)
    return intersection / union if union > 0 else 0.0

def text_to_words(text: str) -> set:
    """Convert text to lowercase word set."""
    words = re.findall(r'\b\w+\b', text.lower())
    return set(words)

def time_distance_minutes(t1: str, t2: str) -> int:
    """Calculate distance in minutes between ISO timestamps."""
    if not t1 or not t2:
        return 9999
    try:
        d1 = datetime.fromisoformat(t1.replace('Z', '+00:00'))
        d2 = datetime.fromisoformat(t2.replace('Z', '+00:00'))
        return abs(int((d1 - d2).total_seconds() / 60))
    except:
        return 9999

def cluster_tweets(tweets: List[Dict], similarity_threshold: float = 0.25) -> List[Dict]:
    """Cluster tweets by topic similarity."""
    if not tweets:
        return []
    
    clusters = []
    assigned = [False] * len(tweets)
    
    # Preprocess tweets
    for i, tweet in enumerate(tweets):
        tweet['words'] = list(text_to_words(tweet.get('text', '')))
        tweet['entities'] = list(extract_entities(tweet.get('text', '')))
        tweet['idx'] = i
    
    # Greedy clustering
    for i, tweet in enumerate(tweets):
        if assigned[i]:
            continue
        
        # Start new cluster
        cluster = {
            'id': len(clusters),
            'topic_name': '',
            'tweet_count': 1,
            'tweets': [tweet],
            'key_entities': list(tweet['entities']),
            'avg_time': tweet.get('time', '')
        }
        assigned[i] = True
        
        # Find similar tweets
        for j, other in enumerate(tweets):
            if i == j or assigned[j]:
                continue
            
            # Entity match bonus
            entity_sim = jaccard_similarity(set(tweet['entities']), set(other['entities']))
            
            # Word similarity
            word_sim = jaccard_similarity(set(tweet['words']), set(other['words']))
            
            # Combined similarity
            combined_sim = entity_sim * 0.7 + word_sim * 0.3
            
            # Time proximity factor
            time_dist = time_distance_minutes(tweet.get('time', ''), other.get('time', ''))
            time_factor = max(0, 1 - time_dist / 120)  # Decay over 2 hours
            
            # Check threshold
            if combined_sim * time_factor >= similarity_threshold:
                cluster['tweets'].append(other)
                cluster['tweet_count'] += 1
                cluster['key_entities'].extend(list(other['entities']))
                assigned[j] = True
        
        # Generate topic name from top entities and words
        all_words_list = list(tweet['words'])
        for t in cluster['tweets'][1:]:
            all_words_list.extend(t['words'])
        all_words_set = set(all_words_list)
        frequent = [w for w in all_words_set if len(w) > 3]
        topic_words = sorted(frequent, key=lambda x: -all_words_list.count(x))[:3]
        cluster['topic_name'] = ' '.join(topic_words) if topic_words else 'Unknown topic'
        cluster['key_entities'] = list(set(cluster['key_entities']))[:10]
        
        clusters.append(cluster)
    
    return clusters

def filter_noise(tweets: List[Dict]) -> List[Dict]:
    """Filter out low-value tweets using heuristics."""
    filtered = []
    for tweet in tweets:
        text = tweet.get('text', '').strip()
        if not text:
            continue
        
        # Skip very short tweets
        if len(text) < 40:
            continue
        
        # Count emojis
        emoji_count = len(re.findall(r'[\U0001F600-\U0001F64F\U0001F300-\U0001F5FF\U0001F680-\U0001F6FF]', text))
        emoji_ratio = emoji_count / len(text) if text else 0
        if emoji_ratio > 0.3:
            continue
        
        # Skip pure opinion
        pure_opinion_patterns = [
            r'^(this is |that\'s |i think |imho )',
            r'^(great|awesome|terrible|wow)$',
            r'^(lol|haha|hmm)$',
            r'^(good morning|good night|sleeping|wake up)',
        ]
        if any(re.match(p, text.lower()) for p in pure_opinion_patterns):
            continue
        
        filtered.append(tweet)
    
    return filtered

def main():
    parser = argparse.ArgumentParser(description='Cluster tweets by topic')
    parser.add_argument('--tweets', required=True, help='JSON file with tweets array')
    parser.add_argument('--output', default='clusters.json', help='Output JSON file')
    parser.add_argument('--threshold', type=float, default=0.25, help='Similarity threshold (0-1)')
    parser.add_argument('--filter', action='store_true', help='Filter noise before clustering')
    
    args = parser.parse_args()
    
    # Load tweets
    with open(args.tweets, 'r') as f:
        tweets = json.load(f)
    
    if not isinstance(tweets, list):
        print("Error: tweets must be a JSON array")
        return 1
    
    print(f"Loaded {len(tweets)} tweets")
    
    # Filter if requested
    if args.filter:
        original_count = len(tweets)
        tweets = filter_noise(tweets)
        print(f"Filtered: {original_count} -> {len(tweets)} tweets")
    
    # Cluster
    clusters = cluster_tweets(tweets, similarity_threshold=args.threshold)
    
    # Generate summary titles
    for cluster in clusters:
        if cluster['tweets']:
            tweet_texts = [t.get('text', '') for t in cluster['tweets']]
            all_words_list = []
            all_words_set = set()
            for text in tweet_texts:
                words_in_text = text_to_words(text)
                all_words_list.extend(words_in_text)
                all_words_set.update(words_in_text)
            common = [w for w in all_words_set if len(w) > 4]
            freq_sorted = sorted(common, key=lambda w: -all_words_list.count(w))
            cluster['summary_words'] = freq_sorted[:5]
    
    # Save output
    output_data = {
        'clusters': clusters,
        'total_tweets': len(tweets),
        'cluster_count': len(clusters),
        'generated_at': datetime.now().isoformat()
    }
    
    with open(args.output, 'w') as f:
        json.dump(output_data, f, indent=2)
    
    print(f"Saved {len(clusters)} clusters to {args.output}")
    return 0

if __name__ == '__main__':
    exit(main())