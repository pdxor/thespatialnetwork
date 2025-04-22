# The Spatial Network

The Spatial Network is a comprehensive platform for managing sustainable projects, permaculture designs, and community collaboration. It provides tools for project planning, task management, inventory tracking, and team coordination.

## Features

### Project Management
- Create and manage sustainable projects with detailed information
- Define permaculture zones (0-4) with specific descriptions
- Track property status (owned land or potential property)
- Document infrastructure systems (water, soil, power)
- Organize project elements into guilds
- Add team members for collaboration
- Upload project images or generate AI-assisted images

### Task Management
- Create tasks with priorities, due dates, and status tracking
- Assign tasks to team members
- Organize tasks by project
- Track task completion
- Kanban-style board view for task organization

### Inventory Management
- Track needed supplies, owned resources, and borrowed/rental items
- Associate inventory with projects or tasks
- Track quantities, prices, and item details
- Search for products and estimate prices with AI assistance
- Budget tracking and financial planning

### Calendar & Events
- Schedule events with detailed information
- Support for recurring events
- Color-coding for visual organization
- Project-specific calendars
- Team coordination with attendee management

### Badge & Achievement System
- Create and award badges for completed tasks
- Design badge quests with multiple tasks
- Track progress on badge quests
- Showcase earned badges on user profiles

### Business Planning
- Generate comprehensive business plans for projects
- AI-assisted business plan development
- Document business strategies and financial projections
- Export business plans to Word documents

### AI Assistance
- Generate content for project descriptions
- Create location-specific permaculture recommendations
- Estimate prices for inventory items
- Generate project images
- Assist with business plan development
- Voice input for quick task and item creation

### User Profiles
- Personalized user profiles with skills and mission statements
- Track project involvement
- Display earned badges
- Avatar customization

## Technology Stack

- **Frontend**: React with TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL database)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **AI Integration**: OpenAI API
- **Search**: Google Custom Search API

## Getting Started

1. Clone the repository
```bash
git clone https://github.com/yourusername/the-spatial-network.git
cd the-spatial-network
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
Create a `.env` file with your Supabase credentials:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Start the development server
```bash
npm run dev
```

5. Build for production
```bash
npm run build
```

## API Keys Setup

To use all features, you'll need to set up the following API keys in the application settings:

- **OpenAI API Key**: For AI-assisted content generation
- **Google API Key**: For product search functionality
- **Google Custom Search Engine ID**: For product search results

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Screenshots

![Project Dashboard](https://images.unsplash.com/photo-1542831371-29b0f74f9713?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80)
![Permaculture Planning](https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80)
![Task Management](https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80)

## Contact

For questions or support, please open an issue on this repository or contact us at support@thespatialnetwork.com
