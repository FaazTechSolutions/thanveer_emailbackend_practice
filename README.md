# AI Email Agent

An intelligent email processing system that automates the ingestion, cleaning, translation, analysis, and decision-making for incoming emails using AI-powered tools.

## Features

- **Email Fetching**: Automatically fetch emails from external APIs
- **Content Cleaning**: Remove HTML, signatures, disclaimers, and quotes from email bodies
- **Language Translation**: Detect and translate Arabic content to English
- **AI Analysis**: Classify emails, extract structured data, identify action items, and determine next best actions
- **Decision Agent**: Automated decision-making for email responses and actions
- **Database Storage**: Store processed emails in PostgreSQL/Neon database
- **REST API**: Expose endpoints for email processing and retrieval

## Architecture

The system consists of several key modules:

- **Email Cleaner** (`utils/email_cleaner/`): Processes raw email HTML/text to extract clean, readable content
- **Translator** (`utils/transulate/`): Detects Arabic text and translates it using AI services
- **Analyzer** (`utils/analyser/`): Uses LangChain and OpenAI to analyze email content and extract insights
- **Decision Agent** (`utils/agents/`): Makes automated decisions on how to handle processed emails
- **Helpers** (`helpers/`): Utility functions for database operations and email fetching

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL database (or Neon serverless)
- API access tokens for external email service
- OpenAI API key
- MSSQL database (optional, for additional storage)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd emailagent
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory with the following variables:

```env
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# External API
Api_token=your_external_api_token

# AI Services
OPENAI_API_KEY=your_openai_api_key
OPENROUTER_API_KEY=your_openrouter_api_key

# Email Service (optional)
EMAIL_USER=your_email@example.com
EMAIL_PASS=your_email_password

# Server
PORT=3000
```

4. Set up the database:
```bash
npm run setup-db
# or manually run the setup scripts in db/setuptables.ts
```

## Usage

### Starting the Server

```bash
npm start
# or for development
npm run dev
```

The server will start on port 3000 (or the port specified in your `.env` file).

### API Endpoints

#### Fetch and Process Emails
```
GET /fetch-and-ingest?page=1&size=10&reqid=optional_specific_id
```
Fetches emails from the external API, processes them through the cleaning, translation, and analysis pipeline, and stores them in the database.

**Query Parameters:**
- `page` (optional): Page number for pagination (default: 1)
- `size` (optional): Number of emails per page (default: 10)
- `reqid` (optional): Specific request ID to reprocess

**Response:**
```json
{
  "success": true,
  "total": 5,
  "page": 1,
  "size": 10,
  "table": "emails_cleaned",
  "data": [...]
}
```

#### Ingest Single Email
```
POST /ingest-email
```
Processes a single email object through the pipeline.

**Request Body:**
```json
{
  "email": {
    "RecId": "12345",
    "Subject": "Email Subject",
    "Comments": "<html>Email content...</html>"
  },
  "reqid": "optional_specific_id"
}
```

#### Retrieve Processed Emails
```
GET /mails?limit=5&offset=0
```
Retrieves processed emails from the database.

**Query Parameters:**
- `limit` (optional): Maximum number of emails to return (default: 5)
- `offset` (optional): Number of emails to skip (default: 0)

## Email Processing Pipeline

1. **Fetch**: Retrieve raw emails from external API
2. **Clean**: Remove HTML tags, signatures, disclaimers, and quotes
3. **Translate**: Detect Arabic content and translate to English
4. **Analyze**: Use AI to classify, extract data, and determine actions
5. **Store**: Save processed data to database
6. **Decide**: Run decision agent for automated responses

## Configuration

The system uses several configuration options that can be customized:

- **Cleaner Config**: Adjust cleaning parameters in `utils/email_cleaner/index.ts`
- **Translation Settings**: Configure translation providers in `utils/transulate/`
- **Analysis Prompts**: Modify AI prompts in `utils/analyser/`
- **Decision Rules**: Customize decision logic in `utils/agents/`

## Development

### Project Structure
```
emailagent/
├── db/                 # Database setup and utilities
├── helpers/            # Helper functions
├── utils/              # Core processing modules
│   ├── analyser/       # Email analysis logic
│   ├── email_cleaner/  # Content cleaning utilities
│   ├── transulate/     # Translation services
│   └── agents/         # Decision agents
├── index.ts            # Main application entry point
├── package.json        # Dependencies and scripts
└── README.md           # This file
```

### Running Tests
```bash
npm test
```

### Building for Production
```bash
npm run build
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

ISC License

## Support

For support or questions, please open an issue in the repository.