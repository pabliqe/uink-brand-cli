# Contributing to OG Brand CLI

Thank you for considering contributing to OG Brand CLI! This document provides guidelines and instructions for contributing.

## 🎯 How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues. When creating a bug report, include:

- **Clear title and description**
- **Steps to reproduce**
- **Expected vs actual behavior**
- **Your environment** (OS, Node version, package version)
- **Your brand.json** (if relevant)
- **Generated output** or error messages

### Suggesting Features

Feature suggestions are welcome! Please:

- **Check existing issues** first
- **Describe the feature** and use cases
- **Explain why** it would be useful
- **Consider backwards compatibility**

### Pull Requests

1. **Fork the repo** and create your branch from `main`
2. **Install dependencies:** `npm install`
3. **Make your changes**
4. **Test your changes:**
   ```bash
   # Test CLI locally
   node bin/cli.js --help
   
   # Create test brand.json and run
   node bin/cli.js
   ```
5. **Commit with clear messages**
6. **Push to your fork** and submit a pull request

## 📝 Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/og-brand-template.git
cd og-brand-template

# Install dependencies
npm install

# Test the CLI
node bin/cli.js --help

# Create a test brand.json
cat > brand.json << 'EOF'
{
  "brand": {
    "name": { "$value": "Test Brand", "$type": "string" },
    "description": { "$value": "Testing the CLI", "$type": "string" }
  },
  "colors": {
    "primary": {
      "DEFAULT": { "$value": "#E00069", "$type": "color" }
    }
  }
}
EOF

# Run the generator
node bin/cli.js

# Check outputs
ls -la public/
ls -la .og-brand/
```

## 🏗️ Project Structure

```
og-brand-template/
├── bin/
│   └── cli.js              # Main CLI entry point
├── lib/
│   ├── parser.js           # DTCG token parser
│   ├── generator.js        # Asset generator
│   └── meta-generator.js   # Meta tags generator
└── examples/               # Usage examples
```

## 🧪 Testing

Currently, testing is manual. Future: automated tests.

**Manual test checklist:**
- [ ] CLI help displays correctly
- [ ] CLI version displays correctly
- [ ] brand.json parsing works (DTCG and plain)
- [ ] All assets are generated
- [ ] manifest.json is valid JSON
- [ ] React components have valid JSX
- [ ] TypeScript files have correct types
- [ ] HTML snippet is valid
- [ ] Generated OG image looks good

## 📋 Code Style

- **Use ES modules** (import/export)
- **No semicolons** (consistent with existing code)
- **Clear function names** and comments
- **Handle errors gracefully**
- **Provide helpful error messages**

## 🔖 Git Commit Messages

- Use present tense ("Add feature" not "Added feature")
- Use imperative mood ("Move cursor" not "Moves cursor")
- First line: short summary (max 72 chars)
- Reference issues: "Fix #123"

**Examples:**
```
Add custom font support for OG images
Fix parsing error for nested DTCG tokens
Update README with Vite examples
Refactor asset generator for better performance
```

## 📦 Releasing (Maintainers Only)

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Commit: `git commit -am "Release v1.x.x"`
4. Tag: `git tag v1.x.x`
5. Push: `git push && git push --tags`
6. Create GitHub release (triggers auto-publish via Actions)

## 🤝 Code of Conduct

### Our Standards

- Be respectful and inclusive
- Welcome newcomers
- Accept constructive criticism
- Focus on what's best for the community

### Not Acceptable

- Harassment or discriminatory language
- Trolling or insulting comments
- Publishing others' private information
- Unprofessional conduct

## ❓ Questions?

- **GitHub Issues:** For bugs and features
- **GitHub Discussions:** For questions and ideas
- **Email:** pabliqe@github (for private matters)

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing! 🎉
