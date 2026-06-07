# Contributing Real Papers to the AI Analysis Benchmark

This guide helps domain experts contribute source-backed academic papers to the benchmark dataset for issue #15.

## 🎯 Goal

Build a verifiable, source-backed benchmark of 50+ real academic papers to validate AI analysis accuracy in Zotero AI Newton.

## 📋 Current Status

- **Total papers needed**: 50
- **Current papers**: 16
- **Gap**: 34 papers
- **Progress**: 32% complete

## 🚀 Quick Start

1. Choose a paper from your domain with clear, verifiable content
2. Extract ground truth data (summary, keywords, related papers)
3. Add fixture to `test/fixtures/ai-analysis-benchmark.json`
4. Run validation: `npm run validate-fixtures` (if added) or `node scripts/validate-fixtures.ts`
5. Submit PR with your contribution

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

## 🎓 Domain Coverage Goals

We aim for diverse coverage across scientific domains:

### Current Coverage (16 papers)

- ✅ Materials: Perovskites, MOFs, thermoelectrics, batteries, graphene
- ✅ Chemistry: Catalysis, CO2 reduction, retrosynthesis
- ✅ Biology: Protein folding, CRISPR, drug delivery
- ✅ Physics: Quantum chemistry, molecular dynamics
- ✅ AI/ML: Machine learning applications

### Needed Domains (34+ papers)

- ⬜ **Materials Science** (5-8 papers): Polymers, ceramics, composites, alloys
- ⬜ **Organic Chemistry** (5-8 papers): Synthesis, spectroscopy, mechanisms
- ⬜ **Biochemistry** (5-8 papers): Enzymes, metabolism, signaling
- ⬜ **Condensed Matter Physics** (5-8 papers): Superconductivity, magnetism
- ⬜ **Computer Science** (3-5 papers): Algorithms, systems, networking
- ⬜ **Medicine** (3-5 papers): Clinical studies, epidemiology
- ⬜ **Earth Sciences** (2-4 papers): Climate, geology, oceanography
- ⬜ **Engineering** (2-4 papers): Mechanical, electrical, civil

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

### Candidate Data

For testing, provide realistic candidate outputs:

- **candidateSummary**: A concise summary that would score well on ROUGE-L and fact coverage
- **candidateKeywords**: Keywords that would score well on F1
- **candidateRelated**: Related paper titles that would score well on relevance

## 🔍 Validation

Before submitting, ensure:

1. **No Fabricated Data**: All paper titles, facts, keywords, and related papers must be real
2. **Source Attribution**: Include DOI/arXiv ID when possible
3. **Consistency**: Candidate data should realistically match expected data
4. **Completeness**: All required fields filled with non-empty values
5. **Uniqueness**: No duplicate fixture IDs

Run validation:

```bash
node scripts/validate-fixtures.ts
```

## 📚 Example Fixture

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

## ❓ Questions?

- **Can I contribute papers I authored?** Yes, if they meet quality criteria
- **Should I include the full paper text?** No, just the ground truth metadata
- **What if I'm unsure about a paper?** Start with a draft PR and ask for review
- **Can I contribute multiple papers?** Yes, multiple paper bundles are welcome!

## 📖 Resources

- Current benchmark: `test/fixtures/ai-analysis-benchmark.json`
- Evaluation logic: `src/modules/aiEvaluation.ts`
- Issue tracker: [Issue #15](https://github.com/newtontech/Zotero-AI-Newton/issues/15)

---

**Thank you for contributing to better AI evaluation in scientific research!** 🎉
