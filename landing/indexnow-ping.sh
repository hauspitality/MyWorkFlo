#!/bin/sh
# Notify Bing/IndexNow-participating engines about all site URLs.
# Run after every production deploy of the landing site.
curl -s -X POST "https://api.indexnow.org/indexnow" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{
    "host": "myworkflo.com",
    "key": "bda283b4a1547075474e691ebebe9c28",
    "keyLocation": "https://myworkflo.com/bda283b4a1547075474e691ebebe9c28.txt",
    "urlList": [
      "https://myworkflo.com/",
      "https://myworkflo.com/pricing",
      "https://myworkflo.com/alternatives",
      "https://myworkflo.com/compare/myworkflo-vs-smith-ai",
      "https://myworkflo.com/compare/myworkflo-vs-podium",
      "https://myworkflo.com/compare/myworkflo-vs-avoca",
      "https://myworkflo.com/compare/myworkflo-vs-allo",
      "https://myworkflo.com/compare/myworkflo-vs-answering-services",
      "https://myworkflo.com/guides/how-to-answer-missed-hvac-calls",
      "https://myworkflo.com/guides/best-ai-call-answering-hvac"
    ]
  }' -w "IndexNow HTTP %{http_code}\n"
