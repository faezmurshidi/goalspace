# GoalSpace

An AI-powered goal-setting and mentorship platform that helps users break down their goals into actionable learning spaces with specialized AI mentors.

## Features

- Goal analysis and breakdown
- Specialized AI mentors for each learning space
- Interactive checklists and progress tracking
- Personalized learning paths
- Dark mode support

## Tech Stack

- Next.js 13 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui Components
- OpenAI GPT-4
- Vercel (Deployment)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- OpenAI API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/GoalSpace.git
cd GoalSpace
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file in the root directory and add your OpenAI API key:
```env
OPENAI_API_KEY=your_api_key_here
```

4. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

```
GoalSpace/
├── app/                    # Next.js app router pages
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   └── ...               # Other components
├── lib/                  # Utility functions
├── public/               # Static assets
└── docs/                 # Documentation
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Next.js](https://nextjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [OpenAI](https://openai.com/) 