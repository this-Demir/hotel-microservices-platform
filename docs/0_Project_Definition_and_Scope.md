# SE 4458 - Final Project Definition & Scope

## 1. Project Overview
This project is an implementation of the **Group 1: Hotel Booking System** (similar to Hotels.com) for the SE 4458 Software Architecture & Design of Modern Large Scale Systems course. 

**Core Philosophy:**
- "It just needs to work."
- Simple UI implementations based on the provided mock-ups are required, but they do not have to be pixel-perfect identical.
- All business use cases MUST be available via REST web services.
- All REST services must be versionable and support pagination when needed.

## 2. Functional Requirements (Hotel Booking System)

### 2.1. Hotel Admin Service
- **Access:** Authenticated service only.
- **Functionality:** Admins can add/update rooms for availability between start and end dates. They define room types (Standard, Family, etc.), room count, and mark status (Vacant/Occupied).
- **Note:** Image uploading is nice-to-have, but NOT strictly necessary.

### 2.2. Hotel Search Service
- **Functionality:** Clients can search hotels by destination point, dates, and number of people.
- **Rules:** - Only rooms explicitly specified as "Vacant" by admins will appear in the results for the given dates.
  - Clients who log in to the application must see **15% discounted prices**.
- **UI Requirement:** A 'Show on Map' (Haritada göster) feature is strictly required for searched hotels.

### 2.3. Book Hotel Service
- **Functionality:** Users can book a hotel on the detail page.
- **Rules:** - The capacity of the hotel MUST be decreased for the specified dates upon booking.
  - NO financial transaction or payment gateway is needed.

### 2.4. Hotel Comments Service
- **Functionality:** Displays user comments and ratings.
- **UI Requirement:** Clicking on comments must show a graph displaying the distribution of comments per service category, along with the text/ratings.
- **Storage:** Comments MUST be stored in a separate NoSQL Database.

### 2.5. Notification Service
- **Task 1 (Queue Listener):** Pull new hotel reservations from the queue and send the user a message about reservation details.
- **Task 2 (Scheduled Job):** A nightly scheduled task that goes over all hotel capacities and notifies hotel administrators if the capacity is below 20% for the next month.

### 2.6. AI Agent Service
- **Functionality:** Implement an AI agent chat window in the main application screen.
- **Rules:** It must use the custom REST APIs created in this project to perform search and booking use cases via prompt/function calling. Real-time messaging (WebSockets) is NOT required.

## 3. Non-Functional & Architecture Requirements

### 3.1. Microservices & Deployment
- **Deployment:** The project must be deployed to cloud providers (e.g., Azure, Google Cloud, Vercel, AWS).
- **Separation:** Hotel Service, Comments Service, and Notification Service MUST be deployed separately.
- **API Gateway:** All APIs must be reached via a central API Gateway.
- **Hosting:** Use cloud services (e.g., Azure App Services, Cloud Run) for API and UI hosting.

### 3.2. Data & Infrastructure
- **Databases:** Create a data model for each data source using managed Cloud Database services (e.g., Azure SQL, Supabase). **SQLite is STRICTLY NOT allowed.**
- **Cache:** At least one distributed caching solution (e.g., Redis) needs to be implemented for storing Hotel details.
- **Queue:** Use a cloud message broker like RabbitMQ or Azure Messaging for queue solutions.
- **Scheduler:** Use cloud scheduling services (e.g., GCP Scheduler, AWS EventBridge/Lambda, Azure Logic Apps) for nightly tasks.

### 3.3. Security & Containerization
- **Authentication:** All user authentication MUST be handled by an IAM service (e.g., AWS Cognito, Supabase Auth, Firebase). External/Social logins (like Google) are not needed. **Local custom authentication implementations are strictly forbidden.**
- **Docker:** A `Dockerfile` MUST be created in the source code. DO NOT create or upload actual compiled Docker image files (they are too big and unnecessary for delivery).

## 4. Final Deliverables
1. Public GitHub repository link.
2. A comprehensive `README.md` containing:
   - Final deployed live URLs of the application.
   - System design and architecture diagram.
   - Assumptions made during development.
   - Issues encountered.
   - Data models (ER Diagrams).
3. A short video presentation link (maximum 5 minutes) demonstrating the project.

---

## 5. Official Course Common Requirements (Source: Assignment Sheet)
These are the verbatim requirements from the course. Our specific technology choices are noted in brackets.

- **Framework:** Any service-oriented framework is acceptable as long as requirements are met. [Our choice: .NET 9 Web API]
- **UI:** Simple UI per mock-ups is required. Does not have to be pixel-perfect — it just needs to work. [Our choice: Next.js on Vercel]
- **REST:** All business use cases must be available via REST web services.
- **Cloud Deployment:** Project must be deployed to cloud providers (Azure, Google Cloud, Vercel, AWS, or any other). [Our choice: mix of Vercel, Cloud Run/App Services, AWS Lambda]
- **Separate Deployments:** Hotel Service, Notification Service, and the AI service must be deployed separately. All APIs must be reached via an API Gateway.
- **Queue:** RabbitMQ or Azure Service Bus are acceptable. [Our choice: RabbitMQ via CloudAMQP free tier]
- **Versioning & Pagination:** All REST services must be versionable and support pagination.
- **Caching:** Redis or in-memory caching are both acceptable, but **at least one distributed caching solution is mandatory** (e.g., hotel details). [Our choice: Redis via Upstash free tier]
- **Authentication:** Must use an IAM service — AWS Cognito, Firebase Authentication, or Supabase Auth. No external/social logins (Google, etc.) needed. **Local/custom authentication implementations are strictly forbidden.** [Our choice: AWS Cognito, with Supabase Auth as documented fallback]
- **AI Agent:** Real-time messaging (WebSockets, SignalR) is NOT required.
- **Assumptions:** Assumptions are allowed as long as they are documented. [See Section 3 of `4_Data_Models.md`]
- **Dockerfile:** A `Dockerfile` MUST exist in every service's source folder. DO NOT create or commit compiled Docker image files (too large).
- **Database:** Create a data model for each data source. Use a managed cloud database service. **SQLite is strictly NOT allowed.** [Our choice: Supabase PostgreSQL + MongoDB Atlas]
- **Hosting:** Use a cloud service for API and UI hosting (e.g., Azure App Services, Cloud Run). [Our choice: Cloud Run or Azure App Services]
- **API Gateway:** Use the gateway implemented in the assignment. Azure API Management is too costly — avoid it. [Our choice: Ocelot (.NET 8)]
- **Scheduler:** Use a cloud scheduling service (e.g., Azure Logic Apps, GCP Cloud Scheduler). These are examples — any cloud scheduler is acceptable. [Our choice: AWS Lambda + EventBridge]
