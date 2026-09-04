# React + Tailwind CSS UI Development Guidelines

## Project Overview
**고롱 (Go냥이)** - A location-based event recommendation platform with React + Tailwind CSS

### Current Setup
- ✅ React 18 with TypeScript
- ✅ Tailwind CSS configured with custom colors (Primary: Orange, Secondary: Blue)
- ✅ Vite build tool
- ✅ React Router for page navigation
- ✅ Lucide React for icons

## Next Steps to Deploy

### 1. Install Dependencies ⚠️ CRITICAL
**You need Node.js 18+ installed first!**

```bash
npm install
```

This will install all dependencies from package.json:
- react, react-dom, react-router-dom
- tailwindcss, autoprefixer, postcss
- vite, typescript, eslint

### 2. Start Development Server
```bash
npm run dev
```
The app will open at http://localhost:3000

### 3. Build for Production
```bash
npm run build
```

## Project Structure Summary

### Pages (src/pages/)
- **Home.tsx**: Recommended events, character animation, code compiler
- **EventList.tsx**: Event filtering and listing
- **EventDetail.tsx**: Event details and map view
- **MiniHome.tsx**: Character status, reviews, gallery
- **Profile.tsx**: User account and settings

### Components (src/components/)
- Button, Input, Card: Core UI components
- RiveCharacter: Character animation (placeholder)
- MapView: Map with path visualization
- IconLabel: Accessibility badges
- Header: Navigation

### Styling Guide
- **Color Scheme**: Primary (Orange) and Secondary (Blue)
- **CSS Classes**: Utility-first approach with Tailwind
- **Custom Classes**: Defined in src/index.css
- **Responsive**: Mobile-first design with md:, lg: breakpoints

## Key Features Implemented

✅ Multi-page navigation with React Router
✅ Tailwind CSS with custom configuration
✅ Component-based architecture
✅ Accessibility support (IconLabel component)
✅ Responsive design
✅ Form handling (Input component)
✅ Filter functionality (EventList)
✅ Character animation integration
✅ Map visualization (placeholder)

## Pre-Integration Checklist

- ✅ UI Components created
- ✅ Page layouts designed
- ✅ Tailwind styling applied
- ✅ TypeScript types defined
- ⚠️ Node.js dependencies not yet installed (needs npm install)
- ⚠️ Rive character animation (needs .riv file)
- ⚠️ Real map API (needs Kakao/Naver/Google Maps integration)
- ⚠️ Backend API (needs server integration)
- ⚠️ Code compiler (needs backend connection)

## Development Guidelines

### Adding New Features
1. Create component in src/components/
2. Use TypeScript interfaces for props
3. Style with Tailwind classes
4. Ensure accessibility with semantic HTML

### Component Naming
- Use PascalCase: Button.tsx, RiveCharacter.tsx
- Props interface: `interface ComponentNameProps`
- Export as default

### Color Usage
- Primary actions: `bg-primary-500`, `hover:bg-primary-600`
- Secondary actions: `bg-secondary-500`, `hover:bg-secondary-600`
- Text: `text-gray-900` (dark), `text-gray-600` (medium), `text-gray-500` (light)

### Responsive Classes
- Base: mobile first
- `md:`: tablet (768px+)
- `lg:`: desktop (1024px+)

## Troubleshooting

### If npm install fails
1. Check Node.js version: `node --version` (needs 18.0.0+)
2. Clear npm cache: `npm cache clean --force`
3. Delete node_modules: `rm -r node_modules`
4. Try again: `npm install`

### If dev server won't start
1. Check if port 3000 is in use
2. Kill process: `lsof -i :3000` or `netstat -ano | findstr :3000`
3. Delete .next folder if exists
4. Run: `npm run dev`

## Next Integration Points

When server is ready, connect:
1. **API Integration**: Replace mock data with real API calls
2. **Rive Animation**: Import actual Go냥이 .riv file
3. **Map API**: Use Kakao Map, Naver Map, or Google Maps
4. **Code Compiler**: Connect to backend compiler service
5. **Authentication**: Implement login/signup

## Team Notes

- Keep components as reusable as possible
- Document component props in TypeScript interfaces
- Use mock data for layout testing
- Test responsive design on all breakpoints
- Maintain consistent naming conventions

