# DFS Lineup Manager

A full-stack web application for managing Daily Fantasy Sports lineups, built with Next.js and FastAPI.

## 🏗️ Architecture

- **Frontend**: Next.js 15 + React 19 + TypeScript + Tailwind CSS
- **Backend**: FastAPI + SQLAlchemy + PostgreSQL
- **State Management**: Zustand
- **UI Components**: Radix UI + Lucide Icons

## 🚀 Features

- **Lineup Builder**: Create and manage fantasy sports lineups
- **Lineup Optimizer**: AI-powered lineup optimization with constraint settings
- **Player Pool Management**: Import and manage player data
- **Historical Analysis**: Track lineup performance over time
- **Import/Export**: CSV support for DraftKings integration
- **Responsive Design**: Mobile-first interface design

## 📁 Project Structure

```
DFS_App/
├── backend/                 # FastAPI backend
│   ├── app/                # Application code
│   │   ├── models.py       # Database models
│   │   ├── routers/        # API endpoints
│   │   └── services/       # Business logic
│   ├── main.py             # FastAPI application
│   └── requirements.txt    # Python dependencies
├── web/                    # Next.js frontend
│   ├── src/
│   │   ├── app/           # App Router pages
│   │   ├── components/    # React components
│   │   ├── lib/           # Utility functions
│   │   └── types/         # TypeScript definitions
│   └── package.json       # Node.js dependencies
└── README.md              # This file
```

## 🛠️ Development Setup

### Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- Git

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run development server
python main.py
```

### Frontend Setup

```bash
cd web

# Install dependencies
npm install

# Run development server
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend: http://localhost:8000

## 🌐 Deployment

### Frontend (Vercel)

1. Push code to GitHub
2. Connect repository to Vercel
3. Set environment variables
4. Deploy automatically

### Backend (Railway)

1. Connect GitHub repository to Railway
2. Set environment variables
3. Deploy automatically

## 🔧 Environment Variables

### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
```

### Backend (.env)
```bash
DATABASE_URL=postgresql://username:password@host:port/database
CORS_ORIGINS=https://your-frontend.vercel.app
ENVIRONMENT=production
```

## 📚 API Documentation

Once the backend is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the API documentation
- Review the code examples in the components
