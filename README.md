# Universal Search for Power Platform ToolBox

A comprehensive search tool for Power Platform ToolBox (PPTB) that enables searching across records, metadata, and solution components in Dataverse environments using specific values and wildcard patterns.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6.3-blue)
![React](https://img.shields.io/badge/React-18.3.1-blue)
![Tests](https://img.shields.io/badge/Tests-97%2F97%20passing-green)

## ✨ Features

### Core Search Capabilities
- 🔍 **Multi-mode search**: Records, metadata, and solution components
- 🎯 **Wildcard support**: Use `*` and `?` for flexible pattern matching
- 📊 **Entity selection**: Choose specific entities or search across all
- 🏷️ **Picklist integration**: Search by option labels and values
- 🔗 **Lookup field support**: Deep search across related records
- ⚙️ **Solution filtering**: Scope searches to specific solutions

### Search Options
- **Case sensitivity**: Toggle case-sensitive/insensitive searches
- **Attribute filtering**: Include/exclude specific attribute types
- **Relationship search**: Navigate through entity relationships
- **Forms & Views**: Search across custom forms and view definitions
- **Real-time results**: Progressive search with live updates

### User Experience
- 📱 **Responsive design**: Optimized for different screen sizes
- 🎨 **Theme awareness**: Automatic light/dark theme detection
- ⌨️ **Keyboard shortcuts**: F11 or Ctrl+Enter for fullscreen
- 📋 **Results export**: Copy results or open records directly
- 🚀 **Progress tracking**: Real-time search progress with cancellation

## 🏗️ Architecture

```
universal-search/
├── src/
│   ├── components/          # React UI components
│   │   ├── EntitySelectionPanel.tsx    # Entity picker
│   │   ├── SearchControlsPanel.tsx     # Search options & controls
│   │   ├── SearchResults.tsx           # Results display with tabs
│   │   └── SearchProgressIndicator.tsx # Progress & cancellation
│   ├── services/            # Business logic
│   │   ├── UniversalSearchService.ts   # Core search engine
│   │   └── MetadataCache.ts            # Metadata caching
│   ├── hooks/               # React hooks
│   │   └── useToolboxAPI.ts            # PPTB API integration
│   ├── types/               # TypeScript definitions
│   │   └── search.ts                   # Search types & interfaces
│   └── test/                # Testing infrastructure
├── dist/                    # Production build output
├── TESTING.md              # Testing documentation
└── README.md               # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js ≥18.0.0
- Power Platform ToolBox
- Access to Dataverse environment

### Installation
```bash
# Install dependencies
npm install

# Run tests
npm test

# Build for production
npm run build
```

### Development
```bash
# Start development server with HMR
npm run dev

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## 🔧 Usage

### Basic Search
1. **Connect** to your Dataverse environment via PPTB
2. **Select entities** to search (or leave blank for all)
3. **Choose search mode**: Records, Metadata, or Solutions
4. **Enter search text** with optional wildcards (`*`, `?`)
5. **Configure options** (case sensitivity, attribute types, etc.)
6. **Click Search** to begin

### Wildcard Patterns
- `*company*` - Matches any text containing "company"
- `test*` - Matches text starting with "test"
- `*Ltd` - Matches text ending with "Ltd"
- `te?t` - Matches "test", "text", "tent", etc.

### Advanced Features
- **Fullscreen mode**: Press F11 or Ctrl+Enter
- **Panel collapse**: Click arrow buttons to hide/show panels
- **Result navigation**: Use tabs to switch between entity results
- **Record opening**: Click table rows to open records in Dataverse
- **Search cancellation**: Use progress indicator to stop long searches

## 🧪 Testing

The project includes comprehensive unit tests with 100% pass rate (97/97 tests):

```bash
# Run all tests
npm test

# Watch mode for development
npm run test:watch

# Coverage report
npm run test:coverage
```

**Test Coverage Areas:**
- ✅ Component rendering and interactions
- ✅ Search service functionality
- ✅ API integrations and error handling
- ✅ Type safety and interface contracts
- ✅ Metadata caching and performance

See [TESTING.md](./TESTING.md) for detailed testing documentation.

## 🔌 PPTB Integration

The tool integrates seamlessly with Power Platform ToolBox APIs:

### Connection Management
```typescript
const { connection, isLoading } = useConnection();
// Automatically handles PPTB connection state
```

### Event Handling
```typescript
useToolboxEvents((event, data) => {
  // Responds to connection changes, theme updates, etc.
});
```

### Notifications
```typescript
await window.toolboxAPI.utils.showNotification({
  title: 'Search Complete',
  body: `Found ${results.length} results`,
  type: 'success'
});
```

## 🛠️ Development

### Key Components
- **UniversalSearchService**: Core search logic with progressive results
- **MetadataCache**: Efficient caching for entity and picklist metadata  
- **SearchControlsPanel**: Tabbed interface for search configuration
- **SearchResults**: Tabular results with highlighting and pagination
- **EntitySelectionPanel**: Multi-select entity picker with search

### Contributing
1. Follow TypeScript strict mode guidelines
2. Maintain 100% test coverage for new features
3. Use React hooks and functional components
4. Follow existing code patterns and naming conventions

## 📄 License

MIT License - see LICENSE file for details.

## 👨‍💻 Author

**Mike Ochs** - [mike@mikefactorial.com](mailto:mike@mikefactorial.com)

---

*Built for Power Platform ToolBox with ❤️ and TypeScript*
