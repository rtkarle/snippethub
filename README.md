# 🚀 SnippetHub — Advanced Code Snippet Manager

> A full-stack web application to save, organize, share, and discover code snippets.  
> Built with **NodeJS · MySQL · Bootstrap 5 · jQuery** — OnlineGDB Internship Project

[![Node.js](https://img.shields.io/badge/Node.js-18+-green?logo=node.js)](https://nodejs.org)
[![MySQL](https://img.shields.io/badge/MySQL-8.0+-blue?logo=mysql)](https://mysql.com)
[![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3-purple?logo=bootstrap)](https://getbootstrap.com)
[![jQuery](https://img.shields.io/badge/jQuery-3.7-blue?logo=jquery)](https://jquery.com)

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔐 **JWT Auth** | Secure register/login with bcrypt password hashing |
| 📝 **Snippet CRUD** | Create, edit, delete, view code snippets |
| 🎨 **Syntax Highlighting** | Highlight.js for 8+ languages |
| 🏷️ **Tags System** | Tag snippets, filter by tag cloud |
| ❤️ **Likes & Comments** | Engage with public snippets |
| 📁 **Collections** | Organize snippets into color-coded folders |
| 🌍 **Explore Page** | Browse all public snippets |
| 📊 **Stats Dashboard** | Views, likes, language breakdown, activity log |
| 🔗 **Share Links** | Public shareable URL per snippet |
| 🕐 **Version History** | Every code edit saves a version |
| 🌙 **Dark/Light Theme** | Persistent theme toggle |
| 📱 **Responsive UI** | Works on mobile, tablet, desktop |
| 🛡️ **Rate Limiting** | Protects auth & API endpoints |
| ⌨️ **Keyboard Shortcuts** | `Ctrl+K` search · `Ctrl+N` new snippet |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Node.js + Express.js |
| **Database** | MySQL 8.0 |
| **Frontend** | Bootstrap 5 + jQuery 3.7 |
| **Auth** | JWT + bcryptjs |
| **Syntax** | Highlight.js |
| **Security** | express-rate-limit, input validation, XSS headers |

---

## 📁 Project Structure

```
snippethub/
├── server.js              # Express app entry point
├── .env                   # Environment config (not committed)
├── package.json
├── db/
│   ├── schema.sql         # Full database schema (9 tables)
│   └── db.js              # MySQL connection pool
├── middleware/
│   ├── auth.js            # JWT verification
│   └── validate.js        # Input validation
├── routes/
│   ├── auth.js            # Register, Login, /me
│   ├── snippets.js        # CRUD, likes, comments, explore, stats
│   ├── collections.js     # Folder management
│   └── profile.js         # Profile, password change, public profile
└── public/
    ├── index.html         # SPA — 5 pages
    ├── style.css          # Dark/light theme CSS
    └── app.js             # jQuery frontend logic
```

---

## ⚡ Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/rtkarle/snippethub.git
cd snippethub
npm install
```

### 2. Setup Database
```bash
# Open MySQL and run:
mysql -u root -p < db/schema.sql
```

### 3. Configure Environment
```bash
# Edit .env file:
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=snippet_manager
JWT_SECRET=your_secret_key
```

### 4. Run
```bash
npm start          # Production
npm run dev        # Development (nodemon)
```

### 5. Open
```
http://localhost:3000
```

---

## 📡 API Endpoints

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login, get JWT |
| GET | `/api/auth/me` | Get current user |

### Snippets
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/snippets` | Get my snippets (filter, sort, paginate) |
| GET | `/api/snippets/explore` | Browse public snippets |
| GET | `/api/snippets/stats` | My statistics |
| GET | `/api/snippets/:id` | Get single snippet |
| POST | `/api/snippets` | Create snippet |
| PUT | `/api/snippets/:id` | Update snippet |
| DELETE | `/api/snippets/:id` | Delete snippet |
| POST | `/api/snippets/:id/like` | Toggle like |
| POST | `/api/snippets/:id/comment` | Add comment |
| GET | `/api/snippets/share/:token` | View public snippet |

### Collections
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/collections` | List collections |
| POST | `/api/collections` | Create collection |
| PUT | `/api/collections/:id` | Rename/recolor |
| POST | `/api/collections/:id/add` | Add snippet |
| DELETE | `/api/collections/:id/remove/:sid` | Remove snippet |
| DELETE | `/api/collections/:id` | Delete collection |

### Profile
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/profile` | Get my profile |
| PUT | `/api/profile` | Update bio/avatar |
| PUT | `/api/profile/password` | Change password |
| GET | `/api/profile/public/:username` | Public profile |

---

## 🗄️ Database Schema

9 tables: `users`, `snippets`, `tags`, `snippet_tags`, `snippet_versions`, `comments`, `snippet_likes`, `collections`, `collection_items`, `activity_log`

---

## 👩‍💻 Developer

**Renuka Tukaram Karle**  
B.Tech Computer Engineering · Sanjivani College of Engineering  
📧 rtkarle03@gmail.com  
🔗 [LinkedIn](https://linkedin.com/in/renuka-karle-6893a9328) · [GitHub](https://github.com/rtkarle)

---

## 📄 License

MIT License — free to use and modify.
