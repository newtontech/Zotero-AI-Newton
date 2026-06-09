# Contributing Real Papers to the AI Analysis Benchmark

This guide helps domain experts contribute source-backed academic papers to the benchmark dataset for issue #15 and issue #33.

## 🎯 Goal

Build a verifiable, source-backed benchmark of 50+ real academic papers to validate AI analysis accuracy and groundedness in Zotero AI Newton.

## 📋 Current Status

- **Total papers needed**: 50
- **Current papers**: 64
- **Gap**: Target exceeded ✅
- **Progress**: Complete

## 🚀 Quick Start

1. Choose a paper from your domain with clear, verifiable content
2. Extract ground truth data (summary, keywords, related papers, citations, evidence)
3. Add fixture to `test/fixtures/ai-analysis-benchmark.json`
4. Run validation: `npm run benchmark-stats`
5. Run benchmark: `npm run benchmark-groundedness`
6. Submit PR with your contribution

## 📝 Fixture Format

Each fixture should include:

### Required Fields

```json
{
  "id": "unique-identifier",
  "title": "Full paper title",
  "expectedFacts": ["fact1", "fact2", "fact3"],
  "expectedKeywords": ["keyword1", "keyword2", "keyword3"],
  "candidateSummary": "Paper summary...",
  "candidateKeywords": ["keyword1", "keyword2", "keyword3"],
  "candidateRelated": ["related paper 1", "related paper 2"],
  "expectedRelated": [
    "ground truth related paper 1",
    "ground truth related paper 2"
  ]
}
```

### Groundedness Fields (Issue #33)

To enable groundedness evaluation, add these optional fields:

```json
{
  "expectedCitations": ["Author2023", "Author2024"],
  "candidateCitations": ["Author"],
  "evidenceChunks": [
    "Direct quote or paraphrase from source PDF...",
    "Another evidence chunk..."
  ],
  "claims": [
    "Claim made in candidate answer supported by evidence.",
    "Another claim..."
  ],
  "insufficientEvidence": false,
  "sourceType": "pdf-text"
}
```

**Field explanations:**

- `expectedCitations`: Citations that should appear in a correct answer
- `candidateCitations`: Citations actually produced by the candidate/system
- `evidenceChunks`: Source text chunks the answer should be grounded in
- `claims`: Discrete claims extracted from the candidate answer
- `insufficientEvidence`: Set to `true` when the correct answer is "insufficient evidence"
- `sourceType`: `"metadata"` (title/abstract only) or `"pdf-text"` (full PDF available)

### Recommended Metadata (for source-backed fixtures)

```json
{
  "doi": "10.1234/example.doi",
  "arxivId": "arXiv:1234.56789",
  "authors": ["Author One", "Author Two"],
  "year": 2024,
  "venue": "Conference/Journal Name"
}
```

## 📚 Domain Coverage Goals

We aim for diverse coverage across scientific domains:

### Current Coverage (64 papers)

- ✅ Materials: Perovskites, MOFs, thermoelectrics, batteries, graphene, composites, 2D materials
- ✅ Chemistry: Catalysis, CO2 reduction, retrosynthesis, organic synthesis, biocatalysis
- ✅ Biology: Protein folding, CRISPR, drug delivery, microbiome, structural biology
- ✅ Physics: Quantum chemistry, molecular dynamics, superconductivity, spintronics
- ✅ AI/ML: Machine learning applications, GNNs, transformers, federated learning
- ✅ Medicine: Clinical trials, immunotherapy, epidemiology
- ✅ Earth Sciences: Climate modeling, ocean acidification, atmospheric chemistry
- ✅ Engineering: Wind turbines, robotics, spacecraft, smart grid, energy harvesting

### Expanding Coverage

Contributions welcome for additional diversity:

- 🔄 **More CS papers**: Algorithms, security, networking, databases
- 🔄 **More interdisciplinary work**: Materials informatics, computational biology
- 🔄 **More negative/insufficient-evidence cases**: Test model refusal behavior

## ✅ Quality Guidelines

### Paper Selection Criteria

1. **Verifiable**: Paper must have DOI, arXiv ID, or other stable identifier
2. **Recent**: Prefer papers from last 5-10 years (2015-2025)
3. **Clear Content**: Well-structured abstract and clearly defined contributions
4. **Domain Relevance**: Representative of key concepts in the field
5. **Accessible**: Open access or widely available

### Ground Truth Extraction

**Expected Facts** (3-5 key facts):

- Main research question or hypothesis
- Key methodology/approach
- Primary results or findings
- Conclusions or implications

**Expected Keywords** (3-5 keywords):

- Domain-specific technical terms
- Method names or techniques
- Material names or system types
- Concepts from author keywords

**Expected Related** (2-3 papers):

- Papers explicitly cited as related work
- Papers addressing similar questions
- Papers using similar methodologies
- Foundational papers in the area

**Expected Citations** (for groundedness):

- Key references that should appear in a correct answer
- Use author-year format (e.g., "Smith2023") or [N] format

**Evidence Chunks** (for groundedness):

- Direct quotes or paraphrases from the source PDF
- Should support specific claims in the answer

### Candidate Data

For testing, provide realistic candidate outputs:

- **candidateSummary**: A concise summary that would score well on ROUGE-L and fact coverage
- **candidateKeywords**: Keywords that would score well on F1
- **candidateRelated**: Related paper titles that would score well on relevance
- **candidateCitations**: Citations the model would produce (for groundedness)

## 🔍 Groundedness Evaluation (Issue #33)

The benchmark now includes groundedness metrics to evaluate whether AI answers are properly supported by sources:

| Metric                 | Description                                            | Target |
| ---------------------- | ------------------------------------------------------ | ------ |
| Citation Precision     | Fraction of candidate citations that are correct       | ≥ 0.50 |
| Citation Recall        | Fraction of expected citations that were found         | ≥ 0.50 |
| Unsupported-Claim Rate | Fraction of claims NOT supported by evidence           | ≤ 0.30 |
| Evidence Coverage      | Fraction of evidence chunks actually used              | ≥ 0.50 |
| Refusal Quality        | Did model correctly refuse when evidence insufficient? | ≥ 0.80 |

### Adding Groundedness Fields

When contributing fixtures, include groundedness fields where applicable:

```json
{
  "expectedCitations": ["Author2023", "Author2024"],
  "candidateCitations": ["Author2023"],
  "evidenceChunks": ["Direct quote from source PDF..."],
  "claims": ["Claim made in answer supported by evidence."],
  "insufficientEvidence": false,
  "sourceType": "pdf-text"
}
```

### Negative Cases

Include cases where `insufficientEvidence: true` to test whether the model correctly refuses to answer when evidence is lacking. The `candidateSummary` should contain a refusal phrase like "insufficient evidence" or "cannot answer."

## 🔍 Validation

Before submitting, ensure:

1. **No Fabricated Data**: All paper titles, facts, keywords, and related papers must be real
2. **Source Attribution**: Include DOI/arXiv ID when possible
3. **Consistency**: Candidate data should realistically match expected data
4. **Completeness**: All required fields filled with non-empty values
5. **Uniqueness**: No duplicate fixture IDs
6. **Groundedness**: Citations and evidence chunks should be realistic

Run validation:

```bash
npm run benchmark-stats
npm run benchmark-groundedness
```

## 📖 Example Fixture

```json
{
  "id": "fixture-graph-neural-networks",
  "title": "Graph Neural Networks for Molecular Property Prediction",
  "expectedFacts": [
    "graph neural network architecture",
    "molecular graph representation",
    "property prediction accuracy"
  ],
  "expectedKeywords": [
    "graph neural network",
    "molecular property prediction",
    "deep learning",
    "computational chemistry"
  ],
  "candidateSummary": "Graph neural network architecture enables accurate molecular property prediction through graph-based representation learning.",
  "candidateKeywords": [
    "graph neural network",
    "molecular property prediction",
    "deep learning",
    "computational chemistry"
  ],
  "candidateRelated": [
    "molecular graph representation learning",
    "quantum chemistry with neural networks"
  ],
  "expectedRelated": [
    "molecular graph representation learning",
    "quantum chemistry with neural networks"
  ],
  "expectedCitations": ["Gilmer2017", "Kipf2017"],
  "candidateCitations": ["Gilmer2017", "Kipf2017"],
  "evidenceChunks": [
    "Graph neural networks achieve state-of-the-art on molecular property prediction.",
    "Message passing neural networks generalize convolutional networks to graphs."
  ],
  "claims": [
    "GNNs enable accurate molecular property prediction.",
    "Graph-based representation learning is effective."
  ],
  "sourceType": "pdf-text",
  "arxivId": "arXiv:1805.00000",
  "authors": ["Researcher One", "Researcher Two"],
  "year": 2018,
  "venue": "NeurIPS"
}
```

## 🤝 Review Process

All contributions will be reviewed for:

1. **Accuracy**: Ground truth data matches the actual paper
2. **Completeness**: All required fields present and valid
3. **Relevance**: Paper fits within target domain coverage
4. **Quality**: Clear, concise, and representative content
5. **Groundedness**: Citations and evidence properly structured

## ❓ Questions?

- **Can I contribute papers I authored?** Yes, if they meet quality criteria
- **Should I include the full paper text?** No, just the ground truth metadata
- **What if I'm unsure about a paper?** Start with a draft PR and ask for review
- **Can I contribute multiple papers?** Yes, multiple paper bundles are welcome!
- **How do I test groundedness?** Run `npm run benchmark-groundedness`

## 📖 Resources

- Current benchmark: `test/fixtures/ai-analysis-benchmark.json`
- Evaluation logic: `src/modules/aiEvaluation.ts`
- Benchmark stats script: `scripts/benchmark-stats.ts`
- Groundedness script: `scripts/benchmark-groundedness.ts`
- Issue tracker: [Issue #33](https://github.com/newtontech/Zotero-AI-Newton/issues/33)

---

**Thank you for contributing to better AI evaluation in scientific research!** 🎉
