# VNR Keys.

A comprehensive key management system with role-based access control, built with React frontend and Node.js backend.

## 🚀 Features

- **Role-based Access Control**: Multiple user roles (Admin, Faculty, Operator, Responder, Security)
- **QR Code Integration**: Generate and scan QR codes for key access
- **Real-time Updates**: Socket.io integration for live updates
- **Secure Authentication**: JWT-based authentication with email verification
- **Responsive Design**: Mobile-first design with Tailwind CSS
- **API Key Management**: Comprehensive API key tracking and management

## 🏗️ Architecture

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Node.js + Express + MongoDB
- **Deployment**: Vercel (Frontend) + Custom Backend Deployment
- **CI/CD**: GitHub Actions with automated testing and deployment

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MongoDB
- Git

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/gurramkarthiknetha/vnr-keys.git
   cd vnr-keys
   ```

2. **Setup Backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env  # Create and configure environment variables
   npm run dev
   ```

3. **Setup Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Access the application**
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3000

## 🔧 CI/CD Pipeline

This project uses GitHub Actions for automated testing, building, and deployment.

### Pipeline Features

- **Automated Testing**: Linting, building, and syntax checking
- **Security Scanning**: Dependency audits and secret detection
- **Multi-platform Deployment**: Vercel (frontend) + Render (backend)
- **Dependency Updates**: Automated weekly dependency updates
- **Branch Protection**: Required reviews and status checks
- **Issue Tracking**: Automatic issue creation for failed deployments
- **Commit Tracking**: Detailed commit information and issue references
- **Deployment Monitoring**: Success/failure tracking with notifications

### Setup Instructions

1. **Run the setup script**
   ```bash
   ./scripts/setup-cicd.sh
   ```

2. **Configure GitHub Secrets**
   - `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`

3. **Enable Branch Protection**
   - Require status checks before merging
   - Require pull request reviews

For detailed setup instructions, see [CI_CD_SETUP.md](CI_CD_SETUP.md).

## 📁 Project Structure

```
vnr-keys/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API and socket services
│   │   ├── store/          # State management (Zustand)
│   │   └── utils/          # Utility functions
│   └── public/             # Static assets
├── backend/                 # Node.js backend API
│   ├── controllers/        # Route controllers
│   ├── models/            # MongoDB models
│   ├── routes/            # API routes
│   ├── middleware/        # Custom middleware
│   └── services/          # Business logic services
├── .github/workflows/      # GitHub Actions workflows
└── scripts/               # Utility scripts
```

## 🔐 Environment Variables

### Backend (.env)
```env
NODE_ENV=development
PORT=3000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:5173
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
```

## 🧪 Testing

### Frontend Tests
```bash
cd frontend
npm run lint
npm run build
```

### Backend Tests
```bash
cd backend
node -c index.js  # Syntax check
npm test          # If tests exist
```

## 📦 Deployment

### Production Deployment

The application is automatically deployed when changes are pushed to the `main` branch:

- **Frontend**: Deployed to Vercel
- **Backend**: Deployed to Render

### Manual Deployment

1. **Frontend (Vercel)**
   ```bash
   cd frontend
   vercel --prod
   ```

2. **Backend (Render)**
   - Push to main branch triggers automatic deployment
   - Or use Render dashboard for manual deployment

## 🔒 Security Features

- JWT-based authentication
- Role-based access control
- Rate limiting
- CORS protection
- Helmet.js security headers
- Input validation and sanitization
- Secure password hashing (bcrypt)

## 📊 Monitoring

- GitHub Actions workflow monitoring
- Vercel deployment analytics
- Render service monitoring
- Application error tracking

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Workflow

1. **Create feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make changes and test locally**
   ```bash
   # Test frontend
   cd frontend && npm run lint && npm run build
   
   # Test backend
   cd backend && node -c index.js
   ```

3. **Push and create PR**
   - Use the provided PR templates for consistent documentation
   - Include issue references in commit messages (`Closes #123`)
   - CI/CD pipeline will automatically run tests
   - Ensure all checks pass before merging

### 📋 PR Templates

- **Comprehensive Template**: `.github/pull_request_template.md`
- **Simple Template**: `.github/pull_request_template_simple.md`

Both templates include:
- Change type classification
- Issue number and title
- Fixes and related issues
- Screenshots/videos section
- Documentation updates
- Summary and breaking changes

## 📝 License

This project is licensed under the ISC License - see the [LICENSE](backend/LICENSE) file for details.

## 🆘 Support

- **Documentation**: [CI_CD_SETUP.md](CI_CD_SETUP.md), [API_KEY_MANAGEMENT.md](API_KEY_MANAGEMENT.md)
- **Issues**: [GitHub Issues](https://github.com/gurramkarthiknetha/vnr-keys/issues)
- **Discussions**: [GitHub Discussions](https://github.com/gurramkarthiknetha/vnr-keys/discussions)

## 🚀 Live Demo

- **Frontend**: [vnr-keys.vercel.app](https://vnr-keys.vercel.app)
- **Backend**: Custom deployment with environment-based configuration

---

## License

This project is licensed under the MLT License. See the [LICENSE](./LICENSE) file for more details.

