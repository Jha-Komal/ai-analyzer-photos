# PhotoRecall Intelligence --- AI Discovery Engine

## Product + Technical Specification

**Project:** Google Photos Core Experience PM Case Study\
**Part:** Part 1 --- AI-Powered Discovery Engine\
**Primary goal:** Discover and evidence how people retrieve vaguely
remembered photos, where retrieval breaks, what users remember/forget,
and which failure patterns deserve primary user research.

------------------------------------------------------------------------

# 1. Executive Summary

PhotoRecall Intelligence is a lightweight AI-native qualitative research
system.

It ingests publicly available conversations about Google Photos and
photo retrieval, converts them into structured **retrieval episodes**,
identifies memory cues and missing information, reconstructs search
behavior, classifies retrieval failures, clusters recurring patterns,
and produces evidence-backed opportunity hypotheses.

The system is intentionally lightweight:

-   Next.js full-stack
-   TypeScript
-   Local JSON files for the initial dataset
-   OpenAI API for extraction and synthesis
-   No vector database
-   No RAG
-   No authentication
-   No separate backend
-   No complex agent framework
-   No production-scale scraping infrastructure

The purpose is not to demonstrate infrastructure engineering. The
purpose is to create a **repeatable research instrument** that helps a
Product Manager move from raw user conversations to defensible product
insights.

------------------------------------------------------------------------

# 2. Core Research Question

The strategic business metric is:

> **Successful retrieval of vaguely remembered photos**

The discovery engine should help answer:

1.  What types of photos do people struggle to retrieve?
2.  What does the user remember about the desired photo?
3.  What information has the user forgotten?
4.  How does the user formulate their search?
5.  How do they reformulate failed searches?
6.  What happens after the first failed search?
7.  What workarounds do users use?
8.  At which stage does retrieval fail?
9.  Which failure patterns recur across users and sources?
10. Which patterns are strong enough to validate through interviews?

The engine must **not** merely answer:

> "Are users frustrated with Google Photos?"

------------------------------------------------------------------------

# 3. Product Principle

## Core unit of analysis: Retrieval Episode

Do not treat an entire review, Reddit post, or forum thread as one
problem.

A single conversation may contain multiple retrieval attempts.

The system should transform each relevant attempt into:

``` text
User memory
    ↓
Target photo
    ↓
Remembered clues
    ↓
Forgotten information
    ↓
Search formulation
    ↓
Search/reformulation behavior
    ↓
Results/outcome
    ↓
Workaround
    ↓
Failure point
```

This structured object is called a **Retrieval Episode**.

------------------------------------------------------------------------

# 4. Scope

## In scope

-   Google Photos retrieval/search
-   Finding old photos
-   Finding old videos
-   Finding screenshots
-   Finding documents/images
-   Finding memories from trips/events
-   Finding photos based on people
-   Finding photos based on objects
-   Finding photos based on visual appearance
-   Finding photos based on text/OCR
-   Finding photos based on approximate time
-   Finding photos based on approximate location
-   Search reformulation
-   Manual browsing as a retrieval workaround
-   Giving up/abandonment
-   Conversations describing successful retrieval after difficulty

## Out of scope

Exclude or separately label:

-   Backup failures
-   Account/login issues
-   Storage problems
-   Deleted photos
-   Google Photos outages
-   Subscription/billing issues
-   Photo editing
-   Sharing-only problems
-   Upload failures
-   Device migration issues

These may mention "can't find my photo" but are not necessarily
memory-based retrieval failures.

------------------------------------------------------------------------

# 5. Initial Data Sources

Start with four sources.

## 5.1 Reddit

Search for discussions around:

``` text
Google Photos can't find photo
Google Photos search doesn't work
Google Photos old photo
Google Photos find specific photo
Google Photos search memory
Google Photos can't find picture
Google Photos search object
Google Photos search screenshot
Google Photos search document
Google Photos find old picture
Google Photos search exact word
Google Photos search keywords
Google Photos timeline scrolling
Google Photos search not showing results
```

Capture:

-   title
-   body
-   author if publicly available
-   date
-   URL
-   subreddit
-   comments when relevant

Do not unnecessarily store sensitive personal information.

------------------------------------------------------------------------

## 5.2 Google Photos Community

Search for:

``` text
Google Photos search
Google Photos can't find
Google Photos keyword search
Google Photos old photos
Google Photos search results
Google Photos search exact caption
Google Photos search object
Google Photos search person
Google Photos timeline
```

Capture:

-   thread title
-   original question
-   relevant replies
-   date
-   URL

------------------------------------------------------------------------

## 5.3 Google Play reviews

Collect reviews containing retrieval-related language.

Potential terms:

``` text
search
find photo
can't find
cannot find
old photo
missing
find picture
search results
search stopped
keyword
```

Do not automatically treat every "missing photo" review as retrieval.

------------------------------------------------------------------------

## 5.4 Apple App Store reviews

Use the same relevance criteria.

------------------------------------------------------------------------

# 6. Raw Data Schema

Create:

`data/raw/documents.json`

Example:

``` json
[
  {
    "id": "reddit_0001",
    "source": "reddit",
    "sourceType": "discussion",
    "title": "Can't find an old photo",
    "text": "Full public conversation text...",
    "url": "https://example.com",
    "publishedAt": "2026-08-14",
    "metadata": {
      "subreddit": "GooglePhotos"
    }
  }
]
```

Required fields:

``` text
id
source
sourceType
title
text
url
publishedAt
metadata
```

------------------------------------------------------------------------

# 7. Processing Pipeline

``` text
RAW PUBLIC DATA
      ↓
Deduplication
      ↓
Relevance Classification
      ↓
Retrieval Episode Extraction
      ↓
Memory Cue Extraction
      ↓
Search Journey Reconstruction
      ↓
Failure Classification
      ↓
Evidence Quality Assessment
      ↓
Human Validation
      ↓
Pattern Synthesis
      ↓
Cluster / Opportunity Analysis
      ↓
Research Question Generation
```

------------------------------------------------------------------------

# 8. Pipeline Jobs

There are three major AI jobs.

## Job 1 --- Extract

``` text
Conversation
→ structured retrieval episode(s)
```

## Job 2 --- Synthesize

``` text
Retrieval episodes
→ recurring patterns
→ clusters
→ failure themes
```

## Job 3 --- Research Hypothesis Generator

``` text
Validated patterns
→ candidate opportunities
→ hypotheses
→ interview questions
```

------------------------------------------------------------------------

# 9. Relevance Classification

Every raw document should first be classified.

Possible values:

``` text
DIRECT_RETRIEVAL
ADJACENT_RETRIEVAL
NOT_RELEVANT
UNCERTAIN
```

## Definitions

### DIRECT_RETRIEVAL

The user is trying to find a visual item they remember or believe
exists.

### ADJACENT_RETRIEVAL

The content is related to finding photos but the cause may be backup,
account, sync, deletion, or another issue.

### NOT_RELEVANT

Not related to photo retrieval.

### UNCERTAIN

Insufficient evidence.

------------------------------------------------------------------------

# 10. Prompt 1 --- Relevance Classifier

Use structured JSON output.

``` text
SYSTEM:

You are a qualitative UX research classifier studying photo retrieval behavior in Google Photos.

Your task is to determine whether the provided public conversation contains evidence relevant to the research problem:

"Users trying to retrieve a photo, video, screenshot, document, or other visual item that they remember exists but cannot easily retrieve."

Do not infer intent that is not supported by the text.

Classify the conversation as one of:

DIRECT_RETRIEVAL
ADJACENT_RETRIEVAL
NOT_RELEVANT
UNCERTAIN

Definitions:

DIRECT_RETRIEVAL:
The user is actively trying to find a visual item or describes difficulty retrieving one using search, browsing, timeline, albums, people, objects, dates, locations, text, or other retrieval methods.

ADJACENT_RETRIEVAL:
The user cannot find a visual item, but the primary issue appears to be backup, synchronization, deletion, account access, storage, device migration, or another non-retrieval problem.

NOT_RELEVANT:
The conversation is unrelated to retrieving visual memories.

UNCERTAIN:
There is insufficient evidence to determine the category.

Important:
- Do not classify based only on words such as "missing" or "find".
- A complaint about deleted or unbacked-up photos is not automatically a retrieval problem.
- Preserve ambiguity rather than guessing.

Return only valid JSON.

JSON schema:

{
  "classification": "DIRECT_RETRIEVAL | ADJACENT_RETRIEVAL | NOT_RELEVANT | UNCERTAIN",
  "confidence": 0.0,
  "evidence": [
    "short exact evidence from the conversation"
  ],
  "reason": "brief explanation",
  "retrievalIntent": true
}
```

------------------------------------------------------------------------

# 11. Retrieval Episode Extraction

A single document may contain multiple episodes.

The extractor must therefore return an array.

------------------------------------------------------------------------

# 12. Retrieval Episode Schema

Create:

`data/processed/episodes.json`

Example:

``` json
{
  "id": "episode_0001",
  "sourceDocumentId": "reddit_0001",

  "scenario": {
    "category": "TRAVEL",
    "description": "Trying to find a photo from a Goa trip"
  },

  "target": {
    "type": "PHOTO",
    "description": "Photo of a small cafe visited in Goa"
  },

  "remembered": {
    "people": [],
    "places": ["Goa"],
    "objects": ["cafe"],
    "events": ["trip"],
    "activities": [],
    "visualAttributes": ["small"],
    "textInImage": [],
    "time": [],
    "relationships": [],
    "context": ["travel"]
  },

  "forgotten": [
    "exact_date",
    "cafe_name",
    "album"
  ],

  "searchJourney": [
    {
      "step": 1,
      "action": "SEARCH",
      "query": "Goa cafe"
    },
    {
      "step": 2,
      "action": "SEARCH",
      "query": "Goa restaurant"
    },
    {
      "step": 3,
      "action": "MANUAL_BROWSE",
      "query": null
    }
  ],

  "outcome": "FOUND_AFTER_WORKAROUND",

  "workaround": "Timeline browsing",

  "failureStage": "RECOVERY",

  "evidence": {
    "directQuote": "Relevant short quote",
    "sourceUrl": "https://example.com"
  },

  "confidence": 0.92
}
```

------------------------------------------------------------------------

# 13. Prompt 2 --- Retrieval Episode Extractor

``` text
SYSTEM:

You are an expert qualitative UX researcher analyzing public conversations about Google Photos retrieval.

Your task is to extract every distinct RETRIEVAL EPISODE contained in the conversation.

A retrieval episode is one attempt by a user to find a specific visual memory or visual item.

IMPORTANT:
- One conversation can contain multiple episodes.
- Do not merge separate retrieval attempts.
- Do not invent information.
- Only record information explicitly stated or strongly supported by the conversation.
- If information is unknown, use an empty array or null.
- Distinguish remembered information from information the user appears not to remember.
- Do not treat technical backup/deletion problems as retrieval problems unless the user is also describing a retrieval attempt.

For each episode identify:

1. What is the user trying to find?
2. What kind of visual item is it?
3. What does the user remember?
4. What information is missing or forgotten?
5. What searches did they perform?
6. How did they reformulate searches?
7. Did they manually browse?
8. Did they use albums, dates, locations, people, or other methods?
9. Did they find the item?
10. If found, how?
11. If not found, what happened?
12. What workaround did they use?
13. Where did retrieval fail?
14. What direct evidence supports the extraction?

Allowed scenario categories:

TRAVEL
FAMILY
FRIENDS
WORK
HEALTH
DOCUMENT
RECEIPT
SCREENSHOT
EVENT
FOOD
SHOPPING
CHILDREN
PET
HOME
HOBBY
OTHER
UNKNOWN

Allowed target types:

PHOTO
VIDEO
SCREENSHOT
DOCUMENT
RECEIPT
MEME
OTHER
UNKNOWN

Return JSON:

{
  "episodes": [
    {
      "episodeId": "...",
      "scenario": {
        "category": "...",
        "description": "..."
      },
      "target": {
        "type": "...",
        "description": "..."
      },
      "remembered": {
        "people": [],
        "places": [],
        "objects": [],
        "events": [],
        "activities": [],
        "visualAttributes": [],
        "textInImage": [],
        "time": [],
        "relationships": [],
        "context": []
      },
      "forgotten": [],
      "searchJourney": [
        {
          "step": 1,
          "action": "SEARCH | REFORMULATE | BROWSE_TIMELINE | OPEN_ALBUM | FILTER_DATE | FILTER_LOCATION | OTHER",
          "query": null,
          "description": ""
        }
      ],
      "outcome": "FOUND_DIRECTLY | FOUND_AFTER_REFORMULATION | FOUND_AFTER_WORKAROUND | NOT_FOUND | ABANDONED | UNKNOWN",
      "workaround": null,
      "failureStage": "NONE | MEMORY_EXPRESSION | QUERY_FORMULATION | QUERY_UNDERSTANDING | SEMANTIC_RETRIEVAL | RESULT_EVALUATION | RECOVERY | UNKNOWN",
      "evidence": {
        "directQuote": "",
        "sourceUrl": ""
      },
      "confidence": 0.0
    }
  ]
}
```

------------------------------------------------------------------------

# 14. Memory Cue Taxonomy

Every remembered clue should be categorized.

## People

Examples:

``` text
mother
friend
coworker
child
unknown person
```

## Places

``` text
Goa
beach
restaurant
office
home
hotel
```

## Objects

``` text
car
dog
laptop
dress
medicine box
receipt
```

## Events

``` text
birthday
wedding
trip
concert
hospital visit
```

## Activities

``` text
eating
swimming
driving
hiking
working
```

## Visual attributes

``` text
red
blue
small
large
round
old
dark
blurry
specific clothing
architecture
```

## Text in image

``` text
medicine name
receipt number
sign
address
document title
```

## Time

``` text
last year
2019
summer
before wedding
around Diwali
```

## Relationships

``` text
photo with my sister
photo of my friend
photo taken by coworker
```

## Context

``` text
during vacation
when I was sick
before moving house
during college
```

------------------------------------------------------------------------

# 15. Prompt 3 --- Memory Cue Normalizer

Use this after extraction when necessary.

``` text
SYSTEM:

Normalize the memory clues from a photo retrieval episode.

The goal is not to rewrite the user's words into a more convenient search query.

The goal is to understand the semantic dimensions of the user's memory.

For each clue classify it as:

PERSON
PLACE
OBJECT
EVENT
ACTIVITY
VISUAL_ATTRIBUTE
TEXT
TIME
RELATIONSHIP
CONTEXT

Preserve the user's meaning.

Do not invent canonical entities.

Example:

"that tiny blue cafe near the beach where we had coconut coffee"

should become:

PLACE: beach
OBJECT: cafe
VISUAL_ATTRIBUTE: tiny
VISUAL_ATTRIBUTE: blue
CONTEXT: near beach
TEXT/CONTENT: coconut coffee
```

------------------------------------------------------------------------

# 16. Forgotten Information

This is a core research dimension.

Possible categories:

``` text
EXACT_DATE
APPROXIMATE_DATE
EXACT_LOCATION
EXACT_PLACE_NAME
ALBUM
FILENAME
PERSON_NAME
EVENT_NAME
OBJECT_NAME
TEXT_CONTENT
PHOTO_SEQUENCE
SOURCE_DEVICE
PHOTOGRAPHER
RELATIONSHIP
CONTEXT
UNKNOWN
```

Do not assume something was forgotten merely because it was not
mentioned.

Only mark information as forgotten if:

-   the user explicitly says they don't remember it, OR
-   the conversation strongly indicates they tried to retrieve without
    knowing it.

Use:

``` text
EXPLICITLY_FORGOTTEN
IMPLIED_MISSING
UNKNOWN
```

if useful.

------------------------------------------------------------------------

# 17. Search Journey Model

The system should reconstruct the sequence of user actions.

Allowed actions:

``` text
SEARCH
REFORMULATE
BROADEN_QUERY
NARROW_QUERY
ADD_PERSON
ADD_LOCATION
ADD_TIME
REMOVE_TERM
TRY_SYNONYM
BROWSE_TIMELINE
OPEN_ALBUM
CHECK_SHARED_ALBUM
FILTER_DATE
FILTER_LOCATION
MANUAL_SCROLL
ASK_OTHER_PERSON
OTHER
```

Example:

``` json
[
  {
    "step": 1,
    "action": "SEARCH",
    "query": "yellow truck"
  },
  {
    "step": 2,
    "action": "TRY_SYNONYM",
    "query": "pickup truck"
  },
  {
    "step": 3,
    "action": "BROADEN_QUERY",
    "query": "truck"
  },
  {
    "step": 4,
    "action": "MANUAL_SCROLL",
    "query": null
  }
]
```

------------------------------------------------------------------------

# 18. Failure Taxonomy

Use six primary failure stages.

## F1 --- MEMORY_EXPRESSION

The user remembers something but cannot formulate a useful search
representation.

Example:

> "That weird thing we saw in the background."

------------------------------------------------------------------------

## F2 --- QUERY_FORMULATION

The user can describe the memory but struggles to turn it into an
effective query.

Example:

The user remembers a scene but repeatedly tries different vague phrases.

------------------------------------------------------------------------

## F3 --- QUERY_UNDERSTANDING

The query appears reasonable but the system appears to interpret the
request incorrectly.

------------------------------------------------------------------------

## F4 --- SEMANTIC_RETRIEVAL

The system appears to understand the intent, but relevant items do not
surface.

------------------------------------------------------------------------

## F5 --- RESULT_EVALUATION

Potentially relevant results exist, but the user cannot efficiently
identify the correct item.

------------------------------------------------------------------------

## F6 --- RECOVERY

The initial search fails and the user does not have an effective next
step.

Examples:

-   timeline scrolling
-   trying random synonyms
-   checking albums manually
-   abandoning search

------------------------------------------------------------------------

# 19. Important distinction

Do not automatically classify:

> "I couldn't find my photo."

as a retrieval failure.

Determine:

``` text
Was the photo actually present?
Was the user trying to retrieve it?
Did they have a memory of it?
Did they attempt search/browsing?
Was the issue search or data availability?
```

This distinction is critical.

------------------------------------------------------------------------

# 20. Prompt 4 --- Failure Classifier

``` text
SYSTEM:

You are classifying the root failure stage of a photo retrieval episode.

Choose the PRIMARY failure stage.

Definitions:

MEMORY_EXPRESSION:
The user's memory is difficult to express as searchable information.

QUERY_FORMULATION:
The user has useful memory clues but struggles to construct an effective query.

QUERY_UNDERSTANDING:
The user provides a reasonable query but the system appears to interpret it incorrectly.

SEMANTIC_RETRIEVAL:
The query/intent appears understandable but relevant photos fail to appear.

RESULT_EVALUATION:
Relevant or potentially relevant results appear, but identifying the correct photo is difficult.

RECOVERY:
The initial search fails and the user lacks an effective recovery path, often leading to manual browsing, repeated random searches, or abandonment.

NONE:
Retrieval was successful without a meaningful failure.

UNKNOWN:
Evidence is insufficient.

Important:
- Do not infer system failure solely because the user did not find the photo.
- Use only evidence from the episode.
- If multiple failures exist, select the earliest PRIMARY failure that most directly explains unsuccessful retrieval.

Return:

{
  "primaryFailureStage": "...",
  "secondaryFailureStages": [],
  "reason": "",
  "evidence": [],
  "confidence": 0.0
}
```

------------------------------------------------------------------------

# 21. Outcome Taxonomy

Use:

``` text
FOUND_DIRECTLY
FOUND_AFTER_REFORMULATION
FOUND_AFTER_WORKAROUND
NOT_FOUND
ABANDONED
UNKNOWN
```

This will eventually support the business metric decomposition.

------------------------------------------------------------------------

# 22. Workaround Taxonomy

Possible values:

``` text
TIMELINE_SCROLLING
ALBUM_BROWSING
DATE_FILTERING
LOCATION_FILTERING
PERSON_SEARCH
OBJECT_SEARCH
TRY_SYNONYMS
BROADEN_SEARCH
NARROW_SEARCH
ASK_ANOTHER_PERSON
CHECK_DEVICE
CHECK_SHARED_ALBUM
USE_EXTERNAL_SEARCH
GIVE_UP
OTHER
NONE
```

------------------------------------------------------------------------

# 23. Evidence Quality

Every AI-generated finding must remain traceable.

For every insight store:

``` text
source IDs
episode IDs
source URLs
short evidence quotes
```

Never allow a synthesis model to produce a claim with no supporting
episodes.

------------------------------------------------------------------------

# 24. Prompt 5 --- Evidence Validator

``` text
SYSTEM:

You are an evidence validator for a qualitative UX research project.

A research claim is provided along with supporting retrieval episodes.

Determine whether the evidence actually supports the claim.

Rules:

1. Do not judge whether the claim sounds plausible.
2. Check whether the supplied episodes support it.
3. Do not introduce external knowledge.
4. Distinguish direct evidence from interpretation.
5. Identify contradictions.
6. Identify whether evidence comes from multiple independent sources.

Return:

{
  "supported": true,
  "strength": "STRONG | MODERATE | WEAK | UNSUPPORTED",
  "supportingEpisodes": [],
  "contradictingEpisodes": [],
  "directEvidence": [],
  "reason": "",
  "sourceDiversity": 0
}
```

------------------------------------------------------------------------

# 25. Human Validation Dataset

Before trusting the automated pipeline, manually code 30--50 episodes.

Create:

`data/evaluation/gold-set.json`

For each:

``` json
{
  "episodeId": "gold_001",
  "expected": {
    "scenario": "TRAVEL",
    "targetType": "PHOTO",
    "memoryCues": ["PLACE", "EVENT", "OBJECT"],
    "forgotten": ["EXACT_DATE"],
    "outcome": "FOUND_AFTER_WORKAROUND",
    "failureStage": "RECOVERY"
  }
}
```

Compare AI output against human labels.

Track:

``` text
relevance accuracy
episode extraction accuracy
failure classification accuracy
memory cue accuracy
outcome accuracy
```

The goal is not academic model evaluation. The goal is to catch
systematic extraction errors before using the results to make PM
conclusions.

------------------------------------------------------------------------

# 26. Prompt 6 --- AI vs Human Evaluation

``` text
SYSTEM:

Compare an AI-generated retrieval episode against a human-coded reference.

For each field classify:

MATCH
PARTIAL_MATCH
MISMATCH
NOT_APPLICABLE

Do not reward plausible information that is absent from the reference.

Identify:

- hallucinated information
- missed information
- incorrect failure stage
- incorrect outcome
- incorrect memory cue
- incorrect forgotten information

Return:

{
  "fieldResults": {},
  "overallQuality": "HIGH | MEDIUM | LOW",
  "criticalErrors": [],
  "recommendationsForPrompt": []
}
```

------------------------------------------------------------------------

# 27. Pattern Synthesis

After extraction and human validation, synthesize recurring patterns.

Do not ask:

> "What are the top complaints?"

Ask:

> "What recurring behavioral patterns explain why users fail to retrieve
> vaguely remembered visual memories?"

------------------------------------------------------------------------

# 28. Prompt 7 --- Pattern Discovery

``` text
SYSTEM:

You are a senior qualitative UX researcher analyzing structured retrieval episodes from Google Photos users.

Identify recurring behavioral patterns that may explain retrieval failure.

A pattern must describe USER BEHAVIOR or a PRODUCT-USER interaction.

Avoid generic themes such as:
- search is bad
- users are frustrated
- Google Photos is confusing

Prefer patterns such as:
- users remember contextual relationships but search using isolated nouns
- users remember visual characteristics but lack canonical terminology
- users abandon semantic search and revert to chronological browsing
- users progressively broaden queries after failed retrieval
- users remember the event but not the metadata required by existing navigation

For each pattern provide:

1. Pattern name
2. Description
3. Number of supporting episodes
4. Source diversity
5. Common memory cues
6. Common forgotten information
7. Common search behaviors
8. Common failure stages
9. Common workarounds
10. Supporting episode IDs
11. Contradicting evidence
12. Research confidence
13. Why this pattern is interesting for further research

Important:
Do not propose a product solution yet.

Return JSON.
```

------------------------------------------------------------------------

# 29. Pattern Object

Example:

``` json
{
  "id": "pattern_001",
  "name": "Context-rich memory, keyword-poor search",
  "description": "Users remember relationships and surrounding context but formulate searches using a small subset of those clues.",
  "supportingEpisodeCount": 27,
  "sourceDiversity": 3,
  "commonMemoryCues": [
    "CONTEXT",
    "RELATIONSHIP",
    "EVENT"
  ],
  "commonForgottenInformation": [
    "EXACT_DATE",
    "ALBUM"
  ],
  "commonSearchBehaviors": [
    "BROADEN_QUERY",
    "TRY_SYNONYM"
  ],
  "commonFailureStages": [
    "QUERY_FORMULATION",
    "RECOVERY"
  ],
  "commonWorkarounds": [
    "TIMELINE_SCROLLING"
  ],
  "supportingEpisodes": [],
  "contradictingEvidence": [],
  "confidence": "HIGH"
}
```

------------------------------------------------------------------------

# 30. Source Diversity

A pattern supported by:

-   Reddit
-   Google Photos Community
-   Play Store

is more useful than one supported only by one thread.

Track:

``` text
sourceDiversity = number of independent source types
```

Do not treat multiple comments from one thread as independent users
unless evidence supports that interpretation.

------------------------------------------------------------------------

# 31. Prompt 8 --- Opportunity Candidate Generator

Only use this AFTER pattern discovery.

``` text
SYSTEM:

You are a Product Manager studying photo retrieval at Google Photos.

Based only on the validated behavioral patterns provided, identify candidate opportunity areas.

Do NOT propose detailed features.

For each opportunity answer:

1. What user behavior is creating the problem?
2. What information does the user retain?
3. What information is missing?
4. Where does the current retrieval journey break?
5. What workaround is used?
6. Why might this matter to successful retrieval?
7. What evidence supports the opportunity?
8. What evidence weakens it?
9. What should be validated through user interviews?

Use this structure:

{
  "opportunity": "",
  "behavioralProblem": "",
  "rememberedInformation": [],
  "missingInformation": [],
  "failureStage": "",
  "workarounds": [],
  "supportingEvidence": [],
  "counterEvidence": [],
  "researchQuestions": [],
  "confidence": "HIGH | MEDIUM | LOW"
}

Do not recommend a solution.
Do not rank opportunities.
Do not claim business impact without evidence.
```

------------------------------------------------------------------------

# 32. Research Question Generation

The engine should help transition from AI discovery to primary research.

For every candidate pattern, generate:

### Behavioral questions

-   Tell me about the last time this happened.
-   What were you trying to find?
-   What did you remember?
-   What did you not remember?
-   What did you try first?
-   What did you try next?
-   How did you decide what to search for?
-   What did you do when that failed?
-   How did you know you were getting closer?

### Probe questions

-   Why did you choose that search term?
-   What other words did you consider?
-   Did you expect Photos to understand what you meant?
-   Did you remember approximately when it was taken?
-   Did you remember who was in it?
-   Did you remember where you were?
-   Did you consider using albums or timeline browsing?

### Outcome questions

-   Did you eventually find it?
-   How long did it take?
-   What finally worked?
-   What would you have done if you had not found it?
-   How valuable was finding it?

------------------------------------------------------------------------

# 33. Prompt 9 --- Interview Guide Generator

``` text
SYSTEM:

You are a senior UX researcher preparing interviews for Google Photos retrieval research.

Generate a semi-structured interview guide based on the provided behavioral pattern.

Rules:

- Focus on past behavior, not hypothetical opinions.
- Ask participants to recount a real retrieval attempt.
- Avoid leading questions.
- Do not tell participants what the research hypothesis is.
- Do not ask "Would you use a feature that..."
- Prioritize actual behavior over stated preferences.
- Include neutral probes.

Return:

{
  "researchObjective": "",
  "openingQuestions": [],
  "coreQuestions": [],
  "behavioralProbes": [],
  "failureProbes": [],
  "workaroundProbes": [],
  "closingQuestions": []
}
```

------------------------------------------------------------------------

# 34. Dashboard

Build the dashboard in Next.js.

## Page 1 --- Overview

Display:

``` text
Documents analyzed
Retrieval episodes
Direct retrieval episodes
Source distribution
Scenario distribution
Failure distribution
Outcome distribution
```

------------------------------------------------------------------------

# 35. Page 2 --- Retrieval Problems

Show cards for recurring patterns.

Each card:

``` text
Pattern
Episode count
Source count
Failure stages
Common memory cues
Common workarounds
Evidence strength
```

Clicking opens supporting evidence.

------------------------------------------------------------------------

# 36. Page 3 --- Retrieval Episodes

Table:

``` text
Episode
Source
Scenario
Target
Remembered cues
Forgotten cues
Search attempts
Outcome
Failure
```

Filters:

``` text
Source
Scenario
Target type
Failure stage
Outcome
Memory cue
Workaround
```

------------------------------------------------------------------------

# 37. Page 4 --- Search Journey

For an individual episode:

``` text
MEMORY
↓
SEARCH
↓
RESULT
↓
REFORMULATION
↓
RESULT
↓
WORKAROUND
↓
OUTCOME
```

This is important because it makes the research behavioral rather than
merely categorical.

------------------------------------------------------------------------

# 38. Page 5 --- Memory Matrix

Create a matrix:

  Memory dimension      Frequency   Search usage   Failure association
  ------------------ ------------ -------------- ---------------------
  Person               calculated     calculated            calculated
  Place                calculated     calculated            calculated
  Object               calculated     calculated            calculated
  Event                calculated     calculated            calculated
  Visual attribute     calculated     calculated            calculated
  Context              calculated     calculated            calculated
  Relationship         calculated     calculated            calculated
  Time                 calculated     calculated            calculated
  Text                 calculated     calculated            calculated

Do not hard-code conclusions.

All numbers must be calculated from the dataset.

------------------------------------------------------------------------

# 39. Page 6 --- Failure Analysis

Visualize:

``` text
Memory Expression
Query Formulation
Query Understanding
Semantic Retrieval
Result Evaluation
Recovery
None
Unknown
```

Also show:

``` text
failure stage × scenario
failure stage × memory cue
failure stage × outcome
failure stage × workaround
```

------------------------------------------------------------------------

# 40. Page 7 --- Evidence Explorer

Every insight should be traceable.

Example:

``` text
PATTERN:
Context-rich memory, keyword-poor search

Supporting episodes:
27

Sources:
Reddit: 11
Community: 8
Play Store: 6
App Store: 2

[View evidence]

Episode 0032
"...."

Episode 0041
"...."

Episode 0087
"...."
```

Never display an AI-generated research claim without a path back to
evidence.

------------------------------------------------------------------------

# 41. Page 8 --- Opportunity Explorer

Display candidate opportunity areas.

Do not rank them automatically.

For each:

``` text
Behavioral problem
Evidence
Affected scenarios
Failure stages
Workarounds
Counter-evidence
Open research questions
```

The PM makes the prioritization decision.

------------------------------------------------------------------------

# 42. Local JSON Data Strategy

Use separate files:

``` text
data/
├── raw/
│   ├── reddit.json
│   ├── community.json
│   ├── playstore.json
│   └── appstore.json
│
├── processed/
│   ├── relevant.json
│   ├── episodes.json
│   ├── patterns.json
│   └── opportunities.json
│
├── evaluation/
│   └── gold-set.json
│
└── taxonomy.json
```

For an MVP, this is sufficient.

If data eventually exceeds practical JSON limits, migrate to
SQLite/Postgres without changing the conceptual data model.

------------------------------------------------------------------------

# 43. Next.js API Routes

Suggested routes:

``` text
POST /api/analyze/relevance
POST /api/analyze/episodes
POST /api/analyze/patterns
POST /api/analyze/opportunities

GET /api/episodes
GET /api/patterns
GET /api/opportunities
GET /api/evidence
GET /api/stats
```

For local research, the GET routes can simply read JSON files.

------------------------------------------------------------------------

# 44. OpenAI API Design

Use structured output / JSON schema wherever supported.

Never rely on free-form text parsing if structured output is available.

Recommended flow:

``` text
OpenAI call 1:
Relevance

OpenAI call 2:
Episode extraction

OpenAI call 3:
Failure classification

OpenAI call 4:
Pattern synthesis

OpenAI call 5:
Evidence validation

OpenAI call 6:
Opportunity candidate generation

OpenAI call 7:
Interview guide generation
```

Do not necessarily run all calls for every document.

------------------------------------------------------------------------

# 45. Cost Control

Do not repeatedly send the same document.

Store:

``` text
analysisVersion
promptVersion
model
processedAt
```

Example:

``` json
{
  "analysisVersion": "v1",
  "promptVersion": "episode-extractor-v3",
  "model": "OPENAI_MODEL",
  "processedAt": "2026-09-28T10:00:00Z"
}
```

If the prompt changes, rerun only the affected pipeline.

------------------------------------------------------------------------

# 46. Caching

Cache LLM responses locally:

``` text
data/cache/
```

Use a hash of:

``` text
input text + prompt version
```

as the cache key.

This prevents unnecessary API costs during development.

------------------------------------------------------------------------

# 47. Batch Processing

Do not manually click "Analyze" 500 times.

Create:

``` text
npm run analyze
```

Pipeline:

``` text
raw documents
→ relevance
→ episodes
→ classification
→ save JSON
```

And:

``` text
npm run synthesize
```

Pipeline:

``` text
episodes
→ patterns
→ evidence validation
→ opportunities
```

------------------------------------------------------------------------

# 48. Suggested package structure

``` text
src/
├── app/
├── components/
├── lib/
│   ├── openai.ts
│   ├── prompts/
│   │   ├── relevance.ts
│   │   ├── episode.ts
│   │   ├── failure.ts
│   │   ├── pattern.ts
│   │   ├── evidence.ts
│   │   ├── opportunity.ts
│   │   └── interview.ts
│   ├── analysis/
│   └── statistics/
│
├── types/
│   ├── document.ts
│   ├── episode.ts
│   ├── pattern.ts
│   └── opportunity.ts
│
└── scripts/
    ├── analyze.ts
    └── synthesize.ts
```

------------------------------------------------------------------------

# 49. TypeScript Types

Core type:

``` typescript
export type RetrievalEpisode = {
  id: string;
  sourceDocumentId: string;

  scenario: {
    category: ScenarioCategory;
    description: string;
  };

  target: {
    type: TargetType;
    description: string;
  };

  remembered: {
    people: string[];
    places: string[];
    objects: string[];
    events: string[];
    activities: string[];
    visualAttributes: string[];
    textInImage: string[];
    time: string[];
    relationships: string[];
    context: string[];
  };

  forgotten: string[];

  searchJourney: SearchStep[];

  outcome: Outcome;

  workaround: string | null;

  failureStage: FailureStage;

  evidence: {
    directQuote: string;
    sourceUrl: string;
  };

  confidence: number;
};
```

------------------------------------------------------------------------

# 50. Research Metrics Generated by the Engine

The engine should calculate descriptive metrics, not product success
metrics yet.

## Dataset metrics

``` text
Number of source documents
Number of relevant documents
Number of retrieval episodes
Episodes per source
Episodes per scenario
Episodes per target type
```

## Memory metrics

``` text
Most common remembered cues
Most common forgotten information
Memory cue combinations
```

## Search metrics

``` text
Average search steps
Average reformulations
Manual browsing frequency
Synonym usage
Query broadening
Query narrowing
```

## Outcome metrics

``` text
Found directly
Found after reformulation
Found after workaround
Not found
Abandoned
```

## Failure metrics

``` text
Failure stage distribution
Failure stage by scenario
Failure stage by memory cue
Failure stage by outcome
```

------------------------------------------------------------------------

# 51. Important Research Guardrails

The AI must not:

-   Invent user motivations
-   Infer emotions without evidence
-   Assume a user forgot something because they didn't mention it
-   Treat all "missing photo" complaints as search failures
-   Turn one anecdote into a general trend
-   Claim causality from qualitative data
-   Claim statistical representativeness
-   Propose a product solution before establishing the behavioral
    problem
-   Hide contradictory evidence
-   Present LLM-generated interpretations as direct user statements

------------------------------------------------------------------------

# 52. Evidence Language

Use careful language.

Instead of:

> Users cannot retrieve photos because Google Photos does not understand
> visual memories.

Use:

> In the analyzed sample, several retrieval episodes involved users
> describing visual or contextual characteristics that did not translate
> into successful search attempts. This pattern warrants validation
> through interviews.

Instead of:

> 40% of users have this problem.

Use:

> 40% of analyzed retrieval episodes in this dataset exhibited this
> pattern.

The denominator matters.

------------------------------------------------------------------------

# 53. Avoid False Precision

If you have:

``` text
27 episodes
```

do not write:

> "27% of Google Photos users..."

Write:

> "27 of the analyzed retrieval episodes..."

This distinction is critical in the final PM case study.

------------------------------------------------------------------------

# 54. Part 1 Final Deliverable

The output of the discovery engine should be:

## A. Dataset

``` text
Raw public conversations
```

## B. Structured retrieval episodes

``` text
100–500+ episodes
```

depending on available data.

## C. Evidence-backed behavioral patterns

Approximately:

``` text
5–15 patterns
```

Do not force a fixed number.

## D. Memory Cue Matrix

``` text
What users remember
vs.
what they don't remember
```

## E. Search Journey Analysis

``` text
How users search
How they reformulate
What they do after failure
```

## F. Failure Taxonomy

``` text
Where retrieval breaks
```

## G. Candidate opportunity areas

``` text
Behavioral problems worth investigating
```

## H. Interview guide

``` text
Questions targeted at the strongest unresolved patterns
```

------------------------------------------------------------------------

# 55. Connection to Part 2

The discovery engine should naturally feed the business metric
decomposition.

Start with:

``` text
Successful retrieval
```

Decompose into:

``` text
User remembers target
        ↓
User can express useful clues
        ↓
System understands clues
        ↓
Relevant candidates retrieved
        ↓
User can identify target
        ↓
User can recover after failed search
        ↓
Successful retrieval
```

Your Part 1 dataset should provide evidence for each stage.

------------------------------------------------------------------------

# 56. Connection to Part 3

The engine should NOT replace interviews.

Its role is:

``` text
AI discovery
      ↓
Find patterns
      ↓
Identify uncertainty
      ↓
Generate hypotheses
      ↓
Design targeted interviews
      ↓
Human research
      ↓
Validate / reject patterns
```

The AI output is a **hypothesis generator**, not ground truth.

------------------------------------------------------------------------

# 57. Connection to Part 4

The eventual problem statement should emerge from:

``` text
Business metric
        ↓
Product outcome
        ↓
AI-discovered pattern
        ↓
Observed behavior
        ↓
Interview validation
        ↓
Root cause
        ↓
Problem definition
```

Do not start with a feature.

------------------------------------------------------------------------

# 58. Suggested Initial Dataset Size

Phase 1:

``` text
50–100 raw conversations
```

Build the pipeline.

Phase 2:

``` text
200–500 raw conversations
```

Run discovery.

Phase 3:

``` text
30–50 manually validated episodes
```

Validate extraction quality.

Phase 4:

``` text
Final evidence base
```

Select patterns for user interviews.

Quality is more important than volume.

------------------------------------------------------------------------

# 59. Recommended Development Sequence

## Day 1

Build:

``` text
Next.js
JSON schema
TypeScript types
basic dashboard
```

## Day 2

Implement:

``` text
relevance classifier
```

## Day 3

Implement:

``` text
retrieval episode extractor
```

## Day 4

Implement:

``` text
failure classifier
memory normalization
```

## Day 5

Manually validate:

``` text
30–50 episodes
```

## Day 6

Build:

``` text
pattern synthesis
evidence explorer
```

## Day 7

Build:

``` text
opportunity explorer
interview question generator
```

------------------------------------------------------------------------

# 60. Final Architecture

``` text
                         ┌───────────────────┐
                         │ Public Sources    │
                         │ Reddit             │
                         │ Community          │
                         │ Play Store        │
                         │ App Store         │
                         └─────────┬─────────┘
                                   │
                                   ▼
                         ┌───────────────────┐
                         │ Raw JSON          │
                         └─────────┬─────────┘
                                   │
                                   ▼
                         ┌───────────────────┐
                         │ Relevance AI      │
                         └─────────┬─────────┘
                                   │
                                   ▼
                         ┌───────────────────┐
                         │ Episode Extractor │
                         └─────────┬─────────┘
                                   │
                                   ▼
                         ┌───────────────────┐
                         │ Memory + Search   │
                         │ Journey Extraction│
                         └─────────┬─────────┘
                                   │
                                   ▼
                         ┌───────────────────┐
                         │ Failure Classifier│
                         └─────────┬─────────┘
                                   │
                                   ▼
                         ┌───────────────────┐
                         │ Human Validation  │
                         └─────────┬─────────┘
                                   │
                                   ▼
                         ┌───────────────────┐
                         │ Pattern Synthesis │
                         └─────────┬─────────┘
                                   │
                                   ▼
                         ┌───────────────────┐
                         │ Evidence Validator│
                         └─────────┬─────────┘
                                   │
                                   ▼
                         ┌───────────────────┐
                         │ Opportunity       │
                         │ Candidates        │
                         └─────────┬─────────┘
                                   │
                                   ▼
                         ┌───────────────────┐
                         │ Interview Guide   │
                         └─────────┬─────────┘
                                   │
                                   ▼
                         ┌───────────────────┐
                         │ Next.js Research  │
                         │ Dashboard         │
                         └───────────────────┘
```

------------------------------------------------------------------------

# 61. Definition of Done

Part 1 is complete when:

-   [ ] At least 3 public source types are represented.
-   [ ] Raw conversations are stored with source URLs.
-   [ ] Retrieval relevance is classified.
-   [ ] Conversations are converted into retrieval episodes.
-   [ ] Multiple episodes can be extracted from one conversation.
-   [ ] Memory cues are structured.
-   [ ] Forgotten/missing information is separated from remembered
    information.
-   [ ] Search journeys are reconstructed.
-   [ ] Search reformulation behavior is captured.
-   [ ] Retrieval outcomes are classified.
-   [ ] Failure stages are classified.
-   [ ] Workarounds are captured.
-   [ ] Every synthesized insight links back to evidence.
-   [ ] 30--50 episodes are manually validated.
-   [ ] AI extraction errors are documented.
-   [ ] Recurring patterns are generated.
-   [ ] Contradicting evidence is retained.
-   [ ] Candidate opportunity areas are generated without prematurely
    prescribing solutions.
-   [ ] Interview questions are generated from unresolved patterns.
-   [ ] Dashboard allows exploration from pattern → episode → original
    source.
-   [ ] No unsupported claims about the overall Google Photos user
    population are made.

------------------------------------------------------------------------

# 62. The Core PM Principle

The final system should make it possible to answer:

> **"What does the user remember, what have they forgotten, what do they
> try, where does retrieval break, and what do they do instead?"**

If the system can answer those questions with traceable evidence, Part 1
has succeeded.

The technical implementation should remain intentionally simple.

The sophistication should come from:

1.  The research model
2.  The retrieval episode schema
3.  The memory taxonomy
4.  The failure taxonomy
5.  Evidence traceability
6.  Human validation
7.  Connecting qualitative evidence to the business metric
