#!/bin/bash
# Analyze adversarial test results

FILE="${1:-data/adversarial-results.jsonl}"

echo "📊 ADVERSARIAL TEST ANALYSIS"
echo "============================"
echo ""

# Basic counts
TOTAL=$(wc -l < "$FILE" | tr -d ' ')
WITH_YAML=$(jq -s '[.[] | select(.yamlGenerated == true)] | length' "$FILE")
VALID=$(jq -s '[.[] | select(.allValid == true)] | length' "$FILE")
INVALID=$(jq -s '[.[] | select(.yamlGenerated == true and .allValid == false)] | length' "$FILE")

echo "📈 Overall Stats:"
echo "   Total tests:     $TOTAL"
echo "   With YAML:       $WITH_YAML"
echo "   Valid:           $VALID ($(echo "scale=1; $VALID * 100 / $WITH_YAML" | bc)%)"
echo "   Invalid:         $INVALID ($(echo "scale=1; $INVALID * 100 / $WITH_YAML" | bc)%)"
echo ""

echo "📂 By Prompt Category:"
jq -s 'group_by(.category) | map({category: .[0].category, total: length, invalid: [.[] | select(.allValid == false and .yamlGenerated == true)] | length}) | sort_by(-.invalid)' "$FILE" | jq -r '.[] | "   \(.category): \(.invalid)/\(.total) invalid"'
echo ""

echo "🔴 Hallucination Types (top 10):"
jq -s '[.[].categories[]] | group_by(.) | map({type: .[0], count: length}) | sort_by(-.count) | .[0:10]' "$FILE" | jq -r '.[] | "   \(.type): \(.count)"'
echo ""

echo "🎯 Top 20 Most Common Error Messages:"
jq -s '[.[].validationResults[].hallucinations[] | .message] | group_by(.) | map({msg: .[0], count: length}) | sort_by(-.count) | .[0:20]' "$FILE" | jq -r '.[] | "   [\(.count)] \(.msg[0:80])..."'
echo ""

echo "💡 Sample Failures (5 examples with corrections):"
jq -s '[.[] | select(.allValid == false and .yamlGenerated == true) | {prompt: .prompt, errors: [.validationResults[].hallucinations[] | {category, message, correction}]}] | .[0:5]' "$FILE"
