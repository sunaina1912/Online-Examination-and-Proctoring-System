# ProctorX: AI Powered Online Exam Proctoring System

## Major Project Documentation

**Project Title:** ProctorX: AI Powered Online Exam Proctoring System  
**Domain:** Web Application Development, Artificial Intelligence, Computer Vision, Online Examination Management  
**Technology Stack:** Next.js, React, TypeScript, Tailwind CSS, MongoDB, Mongoose, NextAuth, Python, FastAPI, OpenCV, MediaPipe, DeepFace, YOLO, Docker  
**Project Type:** Major Project Report Content  
**Prepared For:** Academic Project Documentation and Word Report Preparation  

---

## Certificate

This is to certify that the project titled **"ProctorX: AI Powered Online Exam Proctoring System"** has been designed and developed as a major project. The project demonstrates the development of a full stack online examination platform with integrated AI based proctoring features. The system includes role based authentication, exam creation, exam attempt management, live browser monitoring, webcam based candidate observation, evidence storage, risk scoring, plagiarism checking, reporting, and administrative review.

The project has been implemented using modern web technologies and follows a modular software architecture. The frontend is developed using Next.js and React, the backend uses Next.js API routes with MongoDB as the database, and the AI proctoring service is implemented using Python and FastAPI. The system is designed to support secure, scalable, and transparent online examination workflows.

---

## Acknowledgement

I would like to express my sincere gratitude to my project guide, faculty members, and institution for providing guidance, encouragement, and technical support throughout the development of this project. I am thankful for the opportunity to work on a practical and socially relevant problem in the field of online education and digital assessment.

I also acknowledge the open source technologies, libraries, and developer communities that made the implementation of this project possible. Tools such as Next.js, React, MongoDB, FastAPI, OpenCV, MediaPipe, DeepFace, YOLO, TensorFlow, and Tailwind CSS helped in building a complete working system with modern software engineering practices.

Finally, I thank my peers, friends, and family members for their support, feedback, and motivation during the planning, development, testing, and documentation stages of this project.

---

## Abstract

Online education and remote examination systems have become increasingly important in modern academic and professional environments. However, conducting examinations remotely introduces major challenges related to identity verification, cheating prevention, environment monitoring, and reliable evaluation. Traditional physical invigilation is not available in remote settings, and therefore institutions require digital proctoring systems that can monitor candidates during exams and produce evidence for later review.

**ProctorX** is an AI powered online exam proctoring system designed to support secure remote examinations. The system provides role based access for administrators, examiners, and students. Administrators and examiners can create exams, add questions, configure marks, activate or deactivate exams, and review submissions. Students can register, log in, view available exams, start an exam, answer questions, and submit responses within a fixed time limit.

The major strength of ProctorX is its proctoring module. During an exam, the system monitors candidate activity using browser APIs, webcam capture, audio analysis, and an optional Python AI service. It can detect events such as tab switching, missing face, multiple faces, possible mobile phone presence, unusual gaze, audio disturbances, restricted keyboard shortcuts, network changes, and identity mismatch. Each event is logged with severity, timestamp, source, confidence, and optional evidence images. A risk score is calculated based on proctoring events, and suspicious submissions can be flagged for review.

The system also stores evidence snapshots and recording clips in MongoDB through a dedicated evidence model. It provides reporting features for administrators, including score, pass or fail status, proctoring event timeline, risk score, plagiarism score, and session metrics. The Python service uses OpenCV, MediaPipe, DeepFace, and YOLO based logic to analyze webcam frames and return face count, identity distance, gaze score, and mobile phone detection confidence. If the Python service becomes unavailable, the browser side fallback continues monitoring so that the exam session does not fail suddenly.

This project demonstrates the design and implementation of a full stack AI assisted proctoring platform. It combines web development, database design, authentication, real time monitoring, computer vision, evidence management, and academic reporting. The system is suitable as a prototype for institutions that need a practical, extensible, and transparent online examination solution.

---

## Table Of Contents

1. Introduction
2. Problem Statement
3. Objectives Of The Project
4. Scope Of The Project
5. Existing System
6. Proposed System
7. Feasibility Study
8. System Requirements
9. Technology Stack
10. System Architecture
11. Module Description
12. Database Design
13. API Design
14. AI Proctoring Design
15. Algorithm And Working Flow
16. User Interface Design
17. Security And Privacy Considerations
18. Implementation Details
19. Testing Strategy
20. Results And Discussion
21. Advantages
22. Limitations
23. Future Enhancements
24. Conclusion
25. References
26. Appendices

---

# Chapter 1: Introduction

## 1.1 Background

Education systems across the world are moving toward digital platforms. Learning management systems, virtual classrooms, digital notes, online assignments, and remote assessments are now common in schools, colleges, universities, and training organizations. Among these, online examination is one of the most sensitive areas because it directly affects evaluation, certification, ranking, selection, and academic credibility.

In a physical examination hall, invigilators observe students, verify identities, prevent communication, check unauthorized material, and maintain discipline. In an online examination, the student appears from a remote environment such as home, hostel, lab, or workplace. The examiner cannot directly observe the surroundings. This makes the examination vulnerable to cheating, impersonation, external help, device misuse, tab switching, mobile phone usage, and answer sharing.

To solve these issues, remote proctoring systems are used. A proctoring system digitally monitors the candidate and exam environment. It can use webcam video, microphone input, browser events, screen behavior, secure browser detection, identity verification, and AI based analysis. Instead of depending only on live human invigilators, the system records suspicious events and produces a risk profile for each exam attempt.

ProctorX is developed in this context. It is a complete online exam platform with integrated AI proctoring. It does not only focus on exam delivery, but also provides monitoring, evidence capture, risk scoring, report generation, and administrative review. The system is designed as a practical major project that demonstrates both software development and intelligent monitoring concepts.

## 1.2 Overview Of ProctorX

ProctorX is a web based application built using Next.js and React. The backend uses Next.js API routes and MongoDB. User authentication is implemented with NextAuth using credentials based login. The project supports three main roles:

- **Admin:** Manages the platform, views dashboard statistics, manages exams, and reviews reports.
- **Examiner:** Creates and manages exams, reviews submissions, and monitors exam integrity.
- **Student:** Attempts active exams and receives results after submission.

The online exam process is combined with proctoring. When a student starts an exam, the system creates a submission record and begins monitoring. The proctoring hook activates webcam access, fullscreen checks, audio monitoring, browser activity restrictions, device change checks, and frame analysis. Suspicious events are stored in the submission record. Evidence images and clips are stored separately in an evidence collection.

The Python AI service is used for more advanced proctoring checks. It accepts a webcam frame as a base64 data URL and returns analysis information. The analysis includes the number of faces in the frame, identity distance from the baseline embedding, gaze offscreen score, mobile phone detection status, confidence values, model status, and latency. The web application uses this response to generate proctoring events.

## 1.3 Need For The Project

The need for an AI powered proctoring system arises from the following conditions:

- Remote examinations require a trustworthy method of candidate monitoring.
- Manual live proctoring for every student is expensive and difficult to scale.
- Basic online forms and quizzes do not provide enough exam integrity.
- Institutions need evidence based review instead of automatic punishment.
- Students need a clear exam interface with timer, navigation, and submission tracking.
- Examiners need reports that combine marks, pass or fail status, and risk indicators.
- Modern assessment platforms should support both objective and descriptive questions.

ProctorX addresses these needs through a combined exam management and proctoring workflow. It helps institutions conduct online exams while maintaining a reasonable level of security and reviewability.

## 1.4 Purpose Of Documentation

This documentation explains the ProctorX project in a detailed manner suitable for academic major project submission. It covers problem definition, proposed solution, requirements, architecture, modules, database design, algorithms, implementation, testing, advantages, limitations, and future scope. The content is prepared in a report style so that it can be copied or converted into a Word document.

---

# Chapter 2: Problem Statement

## 2.1 Problem Definition

The main problem addressed by this project is the lack of reliable and affordable monitoring in remote online examinations. When students attempt exams from uncontrolled environments, there is a possibility of unfair practices such as impersonation, using mobile phones, switching tabs, receiving help from another person, reading from unauthorized material, or copying answers from another source.

Existing basic online exam systems usually provide only question display, answer submission, and result calculation. These systems do not monitor student behavior during the exam. Even if they include a timer, the system cannot identify whether the candidate left the exam tab, changed devices, used a phone, or had another person present. This reduces trust in online assessment.

The project therefore aims to develop a platform that supports online exams and continuously monitors the candidate session. The platform should store suspicious events, compute risk score, save evidence, and allow administrators to review flagged submissions.

## 2.2 Detailed Problem Areas

### 2.2.1 Candidate Identity Verification

In remote examinations, it is difficult to confirm that the registered student is the actual person attempting the exam. Impersonation may happen if another person logs in using the student's credentials. A proctoring system should capture an initial identity baseline and compare later frames with the baseline to detect possible mismatch.

### 2.2.2 Environment Monitoring

Students may attempt the exam in an environment where other people are present. A second person may help by reading questions, providing answers, or using another device. The system should detect missing face and multiple face situations.

### 2.2.3 Device And Browser Misuse

Students may switch tabs, open developer tools, take screenshots, copy questions, paste answers, or use unauthorized websites. The system should monitor browser visibility, keyboard shortcuts, copy paste actions, context menu usage, and fullscreen changes.

### 2.2.4 Mobile Phone Usage

Mobile phones can be used to search answers, communicate with others, or capture exam content. Webcam based frame analysis can help detect possible mobile phone presence near the candidate.

### 2.2.5 Audio Disturbance

Conversation or unusual audio may indicate that the candidate is receiving help. Audio analysis can detect elevated background audio or speech like patterns and generate proctoring events.

### 2.2.6 Evidence Based Review

Automatic AI decisions may not always be perfect. A fair proctoring system should not directly fail students based only on one event. Instead, it should log evidence, severity, confidence, and event details so that examiners can review suspicious attempts.

## 2.3 Final Problem Statement

To design and implement a full stack online examination system that enables remote exam delivery and uses AI assisted proctoring to monitor candidate behavior, detect suspicious activities, store evidence, compute risk score, and provide administrative reports for fair review.

---

# Chapter 3: Objectives Of The Project

## 3.1 Primary Objective

The primary objective of ProctorX is to develop a secure and intelligent online exam platform that combines exam management with AI assisted candidate monitoring.

## 3.2 Specific Objectives

- To provide user registration and login with role based access control.
- To allow administrators and examiners to create, edit, activate, and delete exams.
- To support multiple choice and descriptive questions.
- To provide students with an exam interface containing timer, question navigation, and answer saving.
- To automatically submit exams when time expires.
- To monitor candidate activity using browser APIs, webcam input, and audio input.
- To detect suspicious events such as tab switching, missing face, multiple faces, mobile phone presence, identity mismatch, unusual gaze, restricted shortcut usage, and audio detection.
- To integrate a Python based AI service for image frame analysis.
- To provide browser side fallback when the Python service is unavailable.
- To store evidence snapshots and recording clips in MongoDB.
- To compute a risk score based on proctoring events.
- To flag highly suspicious submissions for review.
- To calculate scores, percentages, and pass or fail status.
- To detect simple plagiarism patterns in descriptive answers.
- To provide reports and analytics for administrators and examiners.
- To support Docker based deployment for easier setup.

## 3.3 Learning Objectives

This project also has academic learning objectives:

- Understanding full stack application development using Next.js.
- Learning database modeling using MongoDB and Mongoose.
- Implementing authentication using NextAuth.
- Handling real time browser events and media streams.
- Integrating frontend applications with Python AI services.
- Learning basic computer vision concepts such as face detection, gaze estimation, and object detection.
- Designing evidence based review workflows.
- Applying software testing, modular design, and documentation practices.

---

# Chapter 4: Scope Of The Project

## 4.1 Functional Scope

The functional scope of ProctorX includes user account creation, authentication, role based dashboard redirection, admin and examiner dashboard, exam creation, student exam attempt, countdown timer, answer saving, auto submission, webcam proctoring, browser activity monitoring, audio monitoring, Python AI frame analysis, evidence storage, risk scoring, report generation, and plagiarism checking.

## 4.2 Technical Scope

The technical scope includes Next.js App Router based frontend and backend, TypeScript for type safe development, Tailwind CSS for responsive user interface, MongoDB as NoSQL database, Mongoose schemas, NextAuth credentials based authentication, FastAPI Python microservice, OpenCV and MediaPipe for face and gaze processing, DeepFace for face embedding extraction, YOLO for mobile phone object detection, and Docker Compose for deployment support.

## 4.3 Project Boundaries

The project is designed as a prototype suitable for academic demonstration and future enhancement. It is not presented as a final commercial proctoring product. The system provides AI assisted suspicious activity detection, but final judgement should be made by an examiner. The system does not guarantee perfect cheating detection because real world proctoring depends on camera quality, lighting, user behavior, network condition, device permissions, and model accuracy.

## 4.4 Out Of Scope

The current version does not include full live screen recording, live human proctor video call, payment integration, SMS based login, enterprise LMS integration, advanced natural language plagiarism detection, automatic certificate generation, large scale cloud deployment automation, or legal compliance workflow for every country or institution.

---

# Chapter 5: Existing System

## 5.1 Existing Manual Examination System

In the traditional system, students attend exams in a physical classroom or examination hall. Invigilators check identity cards, distribute question papers, observe the room, prevent communication, and collect answer sheets. This system is trusted because the exam environment is controlled. However, it has limitations such as physical attendance, classroom scheduling, invigilator dependency, printing cost, slow paper evaluation, and difficulty for remote learners.

## 5.2 Existing Basic Online Exam System

Many online exam systems provide only login, question display, timer, submission, and score calculation. These systems are easier to use but have weak security. Student identity is difficult to verify, the system cannot know whether another person is present, students can switch tabs or use unauthorized websites, mobile phone usage is not detected, suspicious behavior is not recorded, and examiners receive only answers and marks.

## 5.3 Existing Proctoring Solutions

Commercial proctoring solutions may provide advanced features such as screen recording, live proctoring, identity verification, AI monitoring, and secure browser integration. However, they can be expensive and difficult to customize for academic projects. They may also raise privacy concerns if not designed transparently.

## 5.4 Limitations Of Existing Systems

- High cost of commercial solutions.
- Lack of customization for specific institutional workflows.
- Limited transparency in AI decisions.
- Dependency on manual proctor availability.
- Poor integration between exam platform and proctoring evidence.
- Lack of report level explanation for flagged events.

---

# Chapter 6: Proposed System

## 6.1 Proposed Solution

ProctorX proposes a combined online exam and AI proctoring platform. Instead of using separate systems for exam delivery and monitoring, it stores exam data, candidate responses, proctoring events, evidence snapshots, risk scores, and reports in a connected workflow.

The system allows examiners to create exams and students to attempt them remotely. During the exam attempt, browser side monitoring and AI frame analysis operate continuously. Suspicious events are logged with severity and evidence. After submission, the examiner can review the candidate's score along with proctoring data.

## 6.2 Main Features Of Proposed System

- Secure login and role based access.
- Exam creation and management.
- Student exam attempt interface.
- Timer based exam submission.
- Webcam, audio, and browser monitoring.
- Python AI service for face and mobile detection.
- Evidence storage in database.
- Risk score based flagging.
- Admin dashboard and reports.
- Plagiarism detection for descriptive answers.
- Docker support for easier deployment.

## 6.3 Why The Proposed System Is Better

The proposed system improves over a basic online exam system by adding monitoring and review features. It improves over manual proctoring by reducing dependency on physical presence. It also improves transparency by storing event details and evidence rather than making hidden decisions.

The system is modular. The web application can run independently, and the Python AI service can be started separately. If the AI service is unavailable, the browser fallback continues basic monitoring. This makes the system more fault tolerant.

## 6.4 Proposed System Workflow

1. Admin or examiner logs in.
2. Examiner creates an exam with questions and settings.
3. Student logs in and views active exams.
4. Student starts an exam.
5. System creates a submission and begins proctoring.
6. Student answers questions within the time limit.
7. Proctoring events are captured and saved.
8. Evidence snapshots or clips are stored when required.
9. Student submits exam or timer auto submits.
10. System calculates score, percentage, pass or fail, plagiarism score, and final status.
11. Admin or examiner reviews reports and flagged events.

---

# Chapter 7: Feasibility Study

## 7.1 Technical Feasibility

The project is technically feasible because all required technologies are available as open source or commonly used development tools. Next.js provides a strong framework for frontend and backend development. MongoDB provides flexible document storage for exams, submissions, and event records. Python provides mature AI and computer vision libraries. Browser APIs provide webcam, microphone, fullscreen, visibility, keyboard event, clipboard event, and media device support.

The application is organized in separate modules, making it easier to develop and test. The Python service communicates with the web app through HTTP APIs, which is a common integration pattern. Docker Compose further improves technical feasibility by allowing the web application, Python service, and MongoDB database to run together.

## 7.2 Operational Feasibility

The system is operationally feasible because it follows familiar online exam workflows. Admins and examiners can create exams, students can attempt them, and reports can be reviewed later. The user interface is web based, so users do not need to install a dedicated desktop application for the main platform.

Students only need a browser, internet connection, webcam, and microphone permission. Administrators can use dashboards and reports to make decisions. The system stores proctoring events in a structured manner, which helps reviewers understand why a submission was flagged.

## 7.3 Economic Feasibility

The project uses open source technologies. There is no mandatory license cost for the main development stack. MongoDB can be hosted locally or on a cloud service. Python libraries are freely available. This makes the project economically feasible for academic institutions and student demonstrations.

The major cost in a production environment would be server infrastructure, storage for evidence files, network bandwidth, and maintenance. However, for prototype and academic use, the system can run on a local machine using Docker Compose.

## 7.4 Schedule Feasibility

The project can be completed within a major project timeline because it uses a clear modular structure. Authentication, exam management, student exam flow, proctoring hook, evidence storage, AI service, and reporting can be developed incrementally. Each module can be tested independently before full integration.

## 7.5 Legal And Ethical Feasibility

Because the system uses webcam, microphone, and evidence storage, privacy and consent are important. The system should inform students before starting the exam. Institutions using such a system should define data retention policies, explain what is monitored, and ensure that evidence is used only for examination integrity review. AI results should support human decision making rather than automatically punish students without review.

---

# Chapter 8: System Requirements

## 8.1 Hardware Requirements

### Development Machine

- Processor: Intel i5 or equivalent minimum, i7 recommended.
- RAM: 8 GB minimum, 16 GB recommended for Python AI models.
- Storage: 5 GB free space minimum.
- Camera: Integrated or external webcam.
- Microphone: Integrated or external microphone.
- Network: Stable internet or local network access.

### Server Machine

- Processor: Multi core CPU.
- RAM: 8 GB minimum, higher recommended for AI service.
- Storage: Depends on number of submissions and evidence files.
- Operating System: Windows, Linux, or macOS.

### Student Machine

- Modern laptop or desktop.
- Webcam and microphone.
- Modern browser such as Chrome, Edge, or Firefox.
- Stable internet connection.

## 8.2 Software Requirements

- Node.js and npm.
- Python 3.10 or compatible version.
- MongoDB.
- Next.js 14.
- React 18.
- TypeScript.
- Tailwind CSS.
- FastAPI.
- Uvicorn.
- OpenCV.
- MediaPipe.
- DeepFace.
- TensorFlow and tf-keras.
- Ultralytics YOLO.
- Docker and Docker Compose, optional but recommended.

## 8.3 Environment Variables

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string |
| `NEXTAUTH_SECRET` | Secret used by NextAuth for signing sessions |
| `NEXTAUTH_URL` | Base URL of the Next.js application |
| `PYTHON_PROCTORING_URL` | URL of the Python AI service |
| `PYTHON_PROCTORING_TIMEOUT_MS` | Optional timeout for Python analysis requests |
| `NEXT_PUBLIC_FACE_API_MODEL_URL` | Optional browser face model source |

## 8.4 Functional Requirements

### Authentication Requirements

- Users must be able to register and log in.
- Passwords must be stored securely using hashing.
- Session management must be handled securely.
- User roles must control page and API access.

### Exam Management Requirements

- Admins and examiners must be able to create exams.
- Exams must support title, description, duration, total marks, and passing marks.
- Exams must contain MCQ and descriptive questions.
- Exams must support active and inactive states.
- Exams must support randomization and negative marking.

### Student Exam Requirements

- Students must be able to view active exams.
- Students must be able to start an exam.
- The system must create a submission record.
- The system must display timer and questions.
- The system must save progress.
- The system must submit exam responses.
- The system must auto submit when time expires.

### Proctoring Requirements

- The system must request webcam and microphone access.
- The system must monitor tab switching.
- The system must block copy, paste, cut, drag, and context menu actions.
- The system must detect restricted keyboard shortcuts.
- The system must detect network changes.
- The system must capture evidence snapshots.
- The system must log proctoring events.
- The system must compute risk score.
- The system must flag high risk submissions.

## 8.5 Non Functional Requirements

- The user interface should be responsive.
- The system should be modular and maintainable.
- The application should provide fallback behavior when the Python service is unavailable.
- Database schemas should support future expansion.
- APIs should validate authentication and authorization.
- Evidence should be linked to submissions.
- The system should avoid automatic final judgement without review.
- The application should be deployable using Docker Compose.

---

# Chapter 9: Technology Stack

## 9.1 Next.js

Next.js is used as the main web framework. It provides App Router based routing, React rendering, API routes, server side functionality, and production build support. In ProctorX, Next.js handles both the frontend pages and backend endpoints.

Important uses in the project include login and registration pages, admin dashboard and reports, exam attempt page, API routes for exams, submissions, reports, proctoring, evidence, and authentication, and middleware for route protection.

## 9.2 React

React is used for building reusable user interface components. Components such as question cards, exam timer, proctoring overlay, admin sidebar, and active monitoring panel are implemented in React.

## 9.3 TypeScript

TypeScript adds static typing to JavaScript. It improves maintainability by defining interfaces for users, exams, submissions, proctoring events, and component props. The project uses TypeScript files such as `.ts` and `.tsx`.

## 9.4 Tailwind CSS

Tailwind CSS is used for styling. It allows fast UI development using utility classes. The application uses Tailwind for layout, spacing, colors, forms, tables, cards, and responsive design.

## 9.5 MongoDB And Mongoose

MongoDB is used as the database because the project data is document oriented. Exams contain arrays of questions, submissions contain arrays of answers and proctoring events, and evidence metadata is linked to submissions. Mongoose provides schema definitions and database models for User, Exam, Submission, and EvidenceBlob.

## 9.6 NextAuth

NextAuth is used for authentication and session management. The project uses credentials based login and JWT sessions. It supports role based access by adding user role data to the session.

## 9.7 Python And FastAPI

Python is used for AI proctoring because computer vision libraries are mature in Python. FastAPI is used to expose AI analysis through HTTP endpoints. The web application sends webcam frames to the Python service and receives analysis results.

## 9.8 OpenCV, MediaPipe, DeepFace, And YOLO

OpenCV is used for image processing and face detection. MediaPipe is used for face detection and face mesh processing. DeepFace is used for face embedding extraction. YOLO is used for object detection, especially possible mobile phone detection.

## 9.9 Docker

Docker Compose helps run the web application, Python service, and MongoDB together. This is useful when local Python or TensorFlow setup becomes difficult.

---

# Chapter 10: System Architecture

## 10.1 Architectural Overview

ProctorX follows a modular client server architecture. The browser client communicates with Next.js API routes. The Next.js backend communicates with MongoDB and the Python AI service. The Python service handles image analysis and returns structured results.

The system can be understood in four layers:

- **Presentation Layer:** React pages and components.
- **Application Layer:** Hooks, API routes, authentication, exam logic, proctoring logic.
- **Data Layer:** MongoDB collections managed through Mongoose.
- **AI Service Layer:** Python FastAPI service for computer vision analysis.

## 10.2 High Level Architecture

```text
Student Browser
  |
  | Webcam, microphone, browser events
  v
Next.js Frontend
  |
  | API calls
  v
Next.js API Routes
  |            \
  |             \ Frame analysis request
  v              v
MongoDB       Python FastAPI AI Service
  |              |
  |              | OpenCV, MediaPipe, DeepFace, YOLO
  v              v
Stored users, exams, submissions, evidence, reports
```

## 10.3 Data Flow Architecture

1. User logs in through the authentication page.
2. NextAuth verifies credentials and creates a session.
3. Role based routing sends the user to the correct dashboard.
4. Examiner creates an exam through the exam API.
5. Student starts an exam through the submission API.
6. The system creates a submission record in MongoDB.
7. Proctoring starts in the browser.
8. Webcam snapshots are captured at intervals.
9. Snapshot is sent to `/api/proctoring/analyze`.
10. Next.js forwards the snapshot to the Python AI service.
11. Python service returns detection results.
12. Browser logs suspicious events using proctoring API.
13. Events and evidence are saved in MongoDB.
14. Student submits answers.
15. Server calculates score, plagiarism score, and final status.
16. Admin reviews reports.

## 10.4 Deployment Architecture

The system can run locally using Node.js, Python, and MongoDB, or using Docker Compose. Docker Compose services include `web` for the Next.js application, `python-ai` for the Python FastAPI service, `mongo` for the database, and an optional `seed` profile for sample data.

---

# Chapter 11: Module Description

## 11.1 Authentication Module

The authentication module manages user login, registration, and session handling. It uses NextAuth with credentials based authentication. User passwords are hashed before storage. After login, the session contains user details such as id, name, email, and role.

Responsibilities of the authentication module include registering new users, logging in existing users, validating passwords, creating JWT sessions, attaching user role to the session, protecting private routes, and restricting administrative APIs to admin and examiner roles.

Authentication is the first security layer of the system. Without authentication, unauthorized users could create exams, view reports, or access submissions. Role based access ensures that students cannot access administrative features.

## 11.2 User Management Module

The user model stores name, email, password, role, and creation timestamp. The supported roles are student, admin, and examiner.

| Role | Description |
| --- | --- |
| Admin | Full platform management and report review |
| Examiner | Exam creation and submission review |
| Student | Attempts exams and views own results |

## 11.3 Exam Management Module

The exam management module allows administrators and examiners to create and manage exams. An exam contains title, description, duration, total marks, passing marks, questions, active status, start time, end time, negative marking setting, and randomization setting.

Supported question types are MCQ and descriptive. MCQ questions contain options and a correct answer. Descriptive questions contain a text based answer that can be reviewed manually and checked with basic plagiarism logic.

Important features include exam activation and deactivation, question builder, marks allocation, randomized question order, randomized MCQ option order, negative marking, and optional start and end availability window.

## 11.4 Student Exam Module

The student exam module handles the exam attempt flow. It displays active exams, starts a submission, renders questions, saves progress, updates current question index, and submits answers. It also resumes an existing in-progress submission if the student reloads or reconnects during an exam.

Important features include exam start request, resume existing submission, timer display, question navigation, answer saving, progress tracking, auto submit on timeout, and result display after submission.

## 11.5 Proctoring Module

The proctoring module is the core intelligent monitoring part of the project. It is implemented mainly in `src/hooks/useProctoring.ts`. This hook controls webcam access, audio monitoring, event detection, AI service communication, fallback detection, evidence upload, session metrics, and risk score updates.

Events detected by this module include face missing, multiple faces, tab switch, audio detected, eye gaze drift, mobile phone detected, print screen, developer tools shortcut, network change, and identity unverified.

The module also stores session metrics such as fullscreen violations, device changes, network disconnects, audio monitoring status, recording support, Python service status, fallback status, analysis attempts, analysis success count, analysis failure count, last snapshot captured time, and detector mode.

## 11.6 Evidence Management Module

Evidence management stores snapshots and recording clips separately from the submission record. This prevents the main submission document from becoming too large and allows evidence to be fetched through a dedicated API.

Evidence types include identity snapshot, incident snapshot, interval snapshot, and recording clip. The evidence is linked to a submission using a submission id and can be shown in report pages.

## 11.7 AI Analysis Module

The AI analysis module is implemented as a Python FastAPI service. It receives an image frame and returns face count, identity embedding, identity distance, gaze offscreen score, mobile phone detection status, mobile confidence, model status, latency, and detector details.

The web application consumes this information and decides whether to log proctoring events. This separation keeps heavy AI processing outside the main web server.

## 11.8 Reporting Module

The reporting module allows administrators and examiners to view exam results and integrity data. Reports include total exams, total students, total submissions, flagged count, pass rate, average score, risk distribution, recent submissions, and detailed submission event timeline.

## 11.9 Plagiarism Detection Module

The plagiarism detection module performs heuristic checking for descriptive answers. It normalizes text, checks for boilerplate patterns, and compares token overlap with previous submissions for the same question. It assigns a plagiarism score and stores flags when suspicious similarity is found.

---

# Chapter 12: Database Design

## 12.1 Database Overview

The project uses MongoDB with Mongoose. MongoDB stores data in flexible document format, which is suitable for nested exam questions, proctoring events, evidence references, and session metrics.

Main collections are Users, Exams, Submissions, and EvidenceBlobs.

## 12.2 User Schema

The User schema stores account details.

| Field | Type | Description |
| --- | --- | --- |
| name | String | Name of user |
| email | String | Unique email address |
| password | String | Hashed password |
| role | String | student, admin, or examiner |
| createdAt | Date | Account creation time |
| updatedAt | Date | Last update time |

The User schema enables identity and authorization. It ensures each account has a role. The password field is marked with `select: false` so that it is not returned by default in normal queries.

## 12.3 Exam Schema

The Exam schema stores exam configuration and questions.

| Field | Type | Description |
| --- | --- | --- |
| title | String | Exam title |
| description | String | Exam description |
| duration | Number | Duration in minutes |
| totalMarks | Number | Total marks |
| passingMarks | Number | Minimum marks required |
| questions | Array | Question list |
| createdBy | ObjectId | User who created the exam |
| isActive | Boolean | Whether exam is available |
| startTime | Date | Optional start date and time |
| endTime | Date | Optional end date and time |
| negativeMarking | Boolean | Whether wrong MCQ answers reduce marks |
| randomize | Boolean | Whether questions/options are randomized |

## 12.4 Question Schema

| Field | Type | Description |
| --- | --- | --- |
| text | String | Question text |
| type | String | mcq or descriptive |
| options | Array | MCQ options |
| correctAnswer | Number | Correct option index |
| marks | Number | Marks for the question |

## 12.5 Submission Schema

The Submission schema is the largest and most important schema because it stores exam attempt data, answers, proctoring events, scoring results, evidence references, plagiarism results, and session metrics.

| Field | Type | Description |
| --- | --- | --- |
| examId | ObjectId | Related exam |
| studentId | ObjectId | Student attempting exam |
| answers | Array | Submitted answers |
| score | Number | Score obtained |
| percentage | Number | Percentage score |
| passed | Boolean | Pass or fail status |
| startedAt | Date | Exam start time |
| submittedAt | Date | Exam submission time |
| proctoringEvents | Array | Suspicious event list |
| riskScore | Number | Computed risk score |
| status | String | in_progress, submitted, or flagged |
| graceUsed | Boolean | Whether grace time was used |
| graceExpiresAt | Date | Submission grace expiry |
| secureBrowserDetected | Boolean | Whether secure browser was detected |
| currentQuestionIndex | Number | Last active question |
| questionOrder | Array | Delivered question order |
| optionOrders | Array | Delivered option orders |
| identityBaselineEmbedding | Array | Baseline face embedding |
| evidenceSnapshots | Array | Snapshot references |
| recordingClips | Array | Clip references |
| plagiarismScore | Number | Text similarity score |
| plagiarismFlags | Array | Plagiarism details |
| sessionMetrics | Object | Runtime monitoring metrics |

## 12.6 Proctoring Event Structure

| Field | Type | Description |
| --- | --- | --- |
| type | String | Event category |
| severity | String | low, medium, high |
| timestamp | Date | Event time |
| details | String | Human readable explanation |
| evidenceImage | String | Optional image data or URL |
| evidenceId | String | Evidence document id |
| source | String | python or browser |
| confidence | Number | AI confidence or heuristic score |
| detectorDetails | Object | Extra detector metadata |

## 12.7 Evidence Blob Schema

Evidence is stored separately in the EvidenceBlob collection.

| Field | Type | Description |
| --- | --- | --- |
| submissionId | ObjectId | Related submission |
| kind | String | snapshot or clip |
| mimeType | String | Media MIME type |
| sizeBytes | Number | File size |
| data | Buffer | Binary evidence data |
| createdAt | Date | Evidence creation time |
| updatedAt | Date | Last update time |

## 12.8 Database Relationships

```text
User 1 ----- many Exams
User 1 ----- many Submissions
Exam 1 ----- many Submissions
Submission 1 ----- many ProctoringEvents
Submission 1 ----- many EvidenceBlobs
Submission 1 ----- many RecordingClips
Submission 1 ----- many PlagiarismFlags
```

## 12.9 Reason For Using MongoDB

MongoDB is suitable because submission records contain nested arrays and flexible event structures. A relational database would require many tables for events, snapshots, clips, answers, flags, and metrics. MongoDB allows related data to be stored naturally in documents while still supporting references where needed.

---

# Chapter 13: API Design

## 13.1 API Overview

The backend is implemented using Next.js API routes. These routes provide authentication, exam management, submission handling, evidence upload, proctoring logs, AI analysis proxy, reports, and active monitoring data.

## 13.2 Authentication APIs

The registration API creates a new user account after validating input, checking duplicate email, hashing password, and saving the user. The NextAuth API handles login, sessions, and authentication callbacks.

## 13.3 Exam APIs

`/api/exams` supports listing and creating exams. `/api/exams/[id]` supports reading, updating, and deleting a specific exam. These APIs are protected so that only authorized users can create or modify exam data.

## 13.4 Submission APIs

`/api/submissions` handles multiple actions. The `start` action creates or resumes an exam submission. The `progress` action saves current answers and question index. The `submit` action finalizes the attempt, calculates score, checks plagiarism, and updates final status. The `GET` method lists submissions depending on the logged in user's role.

## 13.5 Proctoring APIs

`/api/proctoring` stores proctoring events, evidence references, recording clips, and session metrics in the submission. `/api/proctoring/analyze` checks Python service health and forwards webcam frames for AI analysis.

## 13.6 Evidence APIs

`/api/evidence` accepts base64 data URLs for snapshots or clips, saves them as EvidenceBlob records, and returns an evidence URL. `/api/evidence/[id]` returns stored evidence media by id.

## 13.7 Reports API

`/api/reports` returns dashboard statistics such as total exams, total students, total submissions, flagged count, pass rate, average score, risk distribution, and recent submissions.

## 13.8 Python AI Service APIs

The Python service exposes `/health`, `/analyze`, and `/events`. The health endpoint returns service and model status. The analyze endpoint accepts an image frame and returns analysis results. The events endpoint logs forwarded proctoring event payloads for service side observability.

---

# Chapter 14: AI Proctoring Design

## 14.1 Overview

AI proctoring in ProctorX is designed as an assisted monitoring system. It does not replace human judgement. Instead, it continuously observes candidate behavior and generates events that can be reviewed by administrators or examiners.

The proctoring system includes browser based monitoring and Python based AI analysis. Browser based monitoring is always available when permissions are granted. Python analysis improves detection accuracy using computer vision models.

## 14.2 Browser Based Monitoring

Browser based monitoring uses standard browser APIs:

- `getUserMedia` for webcam and microphone.
- Fullscreen API for fullscreen tracking.
- Visibility API for tab switch detection.
- Keyboard events for restricted shortcuts.
- Clipboard events for copy, paste, and cut prevention.
- Context menu event prevention.
- Drag start prevention.
- Network online and offline events.
- Media device change events.
- Web Audio API for audio level and speech like pattern detection.

## 14.3 Python Based Monitoring

The Python service performs frame based analysis. The browser captures an image frame from webcam video and sends it to the backend. The backend forwards it to the Python service. The service decodes the image and applies multiple detection techniques.

### Face Count Detection

The service uses OpenCV Haar cascade detection, histogram equalization, tiled face scanning, and MediaPipe face detection. The best count from these methods is used to determine whether no face, one face, or multiple faces are present.

### Identity Verification

DeepFace is used to extract a face embedding. During the early stage of the exam, an embedding can be stored as the identity baseline. Later embeddings are compared with the baseline using cosine distance. If the distance is high, identity mismatch may be detected.

### Gaze Estimation

MediaPipe face mesh is used to estimate gaze direction. Iris and nose landmarks are compared to calculate an offscreen score. If the score is high, the system may log an eye gaze event.

### Mobile Phone Detection

YOLO is used to detect cell phones in the frame. The project also contains a heuristic detector that searches for rectangular dark objects near the face. This is useful when the YOLO model is unavailable or uncertain.

## 14.4 Event Severity Levels

Events are categorized by severity:

- **Low:** Minor suspicious behavior or informational issue.
- **Medium:** Behavior that may indicate risk but needs review.
- **High:** Strong suspicious indicator such as face missing, multiple faces, mobile detected, identity mismatch, or print screen attempt.

## 14.5 Risk Score Design

The risk score is a numerical value from 0 to 100. Each proctoring event contributes to the score based on type and severity. When the score becomes high enough, the submission can be flagged. This allows the system to summarize overall suspicious behavior instead of treating every event equally.

## 14.6 Hysteresis And False Positive Control

AI detection can be noisy. For example, a face detector may briefly miss a face because of lighting or movement. To reduce false positives, the proctoring hook uses hysteresis for selected events. This means an event may need to appear repeatedly or with high confidence before it is logged.

## 14.7 Fallback Strategy

The Python service may become unavailable due to missing dependencies, model loading errors, or network issues. ProctorX includes a fallback strategy. The web app checks Python service health. If the service is unavailable, fallback becomes active. Browser side face-api or native detectors may be used when available. Browser events such as tab switching, keyboard shortcuts, and audio detection continue. The session metrics record the fallback state.

---

# Chapter 15: Algorithm And Working Flow

## 15.1 Login Algorithm

1. User enters email and password.
2. Server searches user by email.
3. If user is not found, login fails.
4. Server compares password with hashed password.
5. If password is invalid, login fails.
6. If valid, NextAuth creates a session.
7. User is redirected based on role.

## 15.2 Exam Creation Algorithm

1. Examiner enters exam details.
2. Examiner adds questions.
3. For MCQ questions, examiner enters options and correct answer.
4. System validates required fields.
5. Exam is saved in MongoDB.
6. Examiner can activate the exam.

## 15.3 Exam Start Algorithm

1. Student selects an active exam.
2. Student gives required consent and permissions.
3. Client sends start request with exam id.
4. Server verifies authentication.
5. Server checks exam availability.
6. Server checks existing in-progress submission.
7. If existing submission exists, it is resumed.
8. If not, delivery order is generated.
9. New submission is created.
10. Delivered questions are returned to client.
11. Proctoring starts.

## 15.4 Question Randomization Algorithm

1. Read all questions from the exam.
2. If randomization is enabled, shuffle question order.
3. For each MCQ question, shuffle option indexes.
4. Store question order and option orders in the submission.
5. Send delivered questions without correct answers to student.
6. During scoring, map selected displayed option back to original option index.

## 15.5 Proctoring Event Algorithm

1. Capture browser event or AI detection.
2. Create event object with type, severity, details, timestamp, source, and confidence.
3. Capture snapshot if required.
4. Upload evidence if required.
5. Send event to proctoring API.
6. API stores event in submission.
7. Risk score is updated.
8. If risk score crosses threshold, submission status becomes flagged.

## 15.6 Frame Analysis Algorithm

1. Browser captures video frame using canvas.
2. Frame is converted to JPEG data URL.
3. Client sends frame to Next.js analyze route.
4. Analyze route checks authentication and submission ownership.
5. Analyze route checks Python service health.
6. If service is reachable, frame is forwarded to Python service.
7. Python decodes frame.
8. Python detects face count.
9. Python extracts face embedding.
10. Python estimates gaze score.
11. Python detects mobile phone.
12. Python returns analysis result.
13. Client logs events based on thresholds.
14. If Python is unavailable, fallback is activated.

## 15.7 Scoring Algorithm

1. Server receives answers.
2. Server loads exam and submission delivery order.
3. For each answer, find matching question.
4. If question is MCQ, compare selected answer with correct answer.
5. If answer is correct, add marks.
6. If answer is wrong and negative marking is enabled, subtract penalty.
7. Bound final score to minimum zero.
8. Calculate percentage.
9. Determine pass or fail using passing marks.

## 15.8 Plagiarism Detection Algorithm

1. Read descriptive answers from current submission.
2. Normalize text by lowercasing and removing punctuation.
3. Check for common copied or generated patterns.
4. Load previous submitted answers for the same exam.
5. Compare token overlap for matching question ids.
6. If similarity is high, create plagiarism flag.
7. Store plagiarism score and flags.
8. If plagiarism score is very high, mark submission as flagged.

## 15.9 Auto Submission Algorithm

1. Timer starts when exam begins.
2. Remaining seconds are calculated.
3. Timer updates every second.
4. If remaining time reaches zero, submit function is called.
5. Answers are sent to server.
6. Submission is finalized.
7. Result is displayed.

---

# Chapter 16: User Interface Design

## 16.1 UI Design Goals

The user interface is designed to be simple, clear, and practical. Since examinations are time sensitive, the interface should not distract students. Administrators and examiners need tables, forms, and summaries that are easy to understand.

Main UI goals are clear navigation, responsive layout, readable question presentation, visible timer, simple answer controls, clear report tables, proctoring status visibility, and reduced clutter during exam.

## 16.2 Login And Registration Pages

The login page allows existing users to enter email and password. The registration page allows new users to create an account. These pages are important because they are the entry points of the system.

## 16.3 Admin Dashboard

The admin dashboard provides overview statistics such as total exams, total students, total submissions, flagged submissions, pass rate, average score, recent submissions, and risk distribution. The dashboard helps administrators quickly understand platform activity.

## 16.4 Exam Management Page

The exam management page allows creation and editing of exams. It includes fields for exam title, description, duration, total marks, passing marks, active state, randomization, negative marking, and question list. The question builder supports MCQ and descriptive question types.

## 16.5 Student Dashboard

The student dashboard displays active exams, exam duration, exam status, previous attempts, and result summaries. Students can start an available exam from this page.

## 16.6 Exam Attempt Interface

The exam attempt interface contains a countdown timer, current question, MCQ options or descriptive answer field, question navigation, answered and unanswered indicators, submit button, and proctoring overlay. The design should help students focus on answering questions while the system monitors in the background.

## 16.7 Reports Page

Reports show submission details in a structured format. They include student name and email, exam title, score and percentage, pass or fail status, risk score, submission status, proctoring events, evidence snapshots, recording clips, plagiarism flags, and session metrics.

---

# Chapter 17: Security And Privacy Considerations

## 17.1 Authentication Security

The system uses hashed passwords and session based authentication. Passwords are not stored in plain text. NextAuth handles session management. API routes check the current session before returning sensitive data.

## 17.2 Role Based Access Control

Role based access is important because different users have different permissions. Students should not access exam creation pages, students should not view other students' submissions, admins and examiners should access reports, and only authorized users should update exams.

## 17.3 API Authorization

API routes verify session and role before performing actions. For example, submission detail APIs should ensure that students can only access their own submissions, while admins and examiners can access all relevant reports.

## 17.4 Evidence Privacy

Evidence images and clips may contain sensitive personal data. They should be stored securely and accessed only by authorized reviewers. In production, institutions should define evidence retention periods and deletion policies.

## 17.5 Consent

Before starting an exam, students should be informed that webcam, microphone, browser activity, and exam behavior may be monitored. The student should provide consent before continuing.

## 17.6 AI Fairness

AI proctoring can produce false positives. Poor lighting, camera quality, face angle, network delay, or model limitations can affect detection. Therefore, the system stores event details and evidence for human review. Automated flagging should be treated as an indicator, not final proof of cheating.

## 17.7 Data Security

Recommended security practices include using HTTPS in production, using a strong `NEXTAUTH_SECRET`, restricting database access, validating API input, protecting evidence routes, avoiding unnecessary sensitive logs, keeping dependencies updated, and applying secure deployment configuration.

## 17.8 Secure Browser Detection

The system can detect Safe Exam Browser related user agent or headers. If detected, secure browser trust is marked higher. If not detected, the system runs in standard mode with reduced trust.

---

# Chapter 18: Implementation Details

## 18.1 Project Structure

```text
proctorx/
  src/
    app/
      auth/
      admin/
      exam/
      api/
    components/
      admin/
      exam/
      proctoring/
    hooks/
      useProctoring.ts
      useExamTimer.ts
    lib/
      auth.ts
      db.ts
      exam.ts
      evidence.ts
      utils.ts
    models/
      User.ts
      Exam.ts
      Submission.ts
      EvidenceBlob.ts
  python/
    proctoring_service/
      main.py
    requirements.txt
  public/
    models/
    diagrams/
  scripts/
    seed.ts
    setup-face-models.mjs
  Dockerfile
  docker-compose.yml
  package.json
```

## 18.2 Frontend Implementation

The frontend is built using React components inside the Next.js App Router. Pages are organized by route. The student exam page uses hooks to manage timer, answer state, submission state, and proctoring.

The frontend communicates with backend routes using `fetch`. During an exam, it sends progress updates and proctoring events to the server. The camera video is attached to a video element, and snapshots are captured using a canvas.

## 18.3 Backend Implementation

The backend uses API routes inside the `src/app/api` directory. Each route handles a specific domain operation. For example, `/api/submissions` handles start, progress, and submit actions. `/api/proctoring/analyze` acts as a proxy between the browser and Python service.

Backend responsibilities include session validation, role checking, database queries, score calculation, submission status update, evidence storage, AI service communication, and report aggregation.

## 18.4 Database Implementation

Mongoose schemas define the shape of data. The database connection is managed through a reusable `dbConnect` utility. Models are reused safely by checking `mongoose.models` before creating a model, which avoids model overwrite errors during development.

## 18.5 Exam Delivery Implementation

Exam delivery is implemented in `src/lib/exam.ts`. The logic creates question order and option order arrays. These arrays are stored in the submission so that the student receives a randomized version, but the server can still correctly score the original answer.

## 18.6 Scoring Implementation

The scoring function checks MCQ answers only. Descriptive answers are stored for review and plagiarism checking. If negative marking is enabled, wrong MCQ answers reduce marks by a calculated penalty. The score is bounded to zero to avoid negative final marks.

## 18.7 Proctoring Hook Implementation

The `useProctoring` hook is the central monitoring module. It maintains risk score, status, events, camera active state, recorder support, fullscreen state, session metrics, and identity snapshot.

It uses refs for streams, timers, detectors, recording chunks, baseline embeddings, audio analysis, fallback state, and request control. Major operations include starting the media stream, attaching stream to video, capturing snapshot, uploading evidence, analyzing frame with backend, loading face models, loading object detector, detecting face events, detecting audio events, listening to browser restrictions, and stopping proctoring with cleanup.

## 18.8 Python Service Implementation

The Python service is implemented in `python/proctoring_service/main.py`. It uses FastAPI and Pydantic models for request and response validation. It warms up models during startup and tracks service status.

Important functions include `decode_data_url`, `detect_faces_count`, `extract_embedding`, `estimate_gaze_offscreen_score`, `detect_mobile_phone`, `service_status`, and `analyze`.

## 18.9 Evidence Implementation

Evidence data URLs are parsed to extract MIME type and binary buffer. The binary data is stored in the EvidenceBlob collection. The system returns a relative URL such as `/api/evidence/<id>` so that reports can fetch evidence later.

## 18.10 Docker Implementation

The Docker setup contains configuration for the Next.js web service, Python AI service, MongoDB service, and optional seed service. Docker makes setup easier because Python AI dependencies can be difficult to install manually on some machines.

---

# Chapter 19: Testing Strategy

## 19.1 Testing Overview

Testing is required to ensure that authentication, exam creation, exam attempt, proctoring, evidence storage, scoring, and reporting work correctly. Since ProctorX includes both normal web features and AI based behavior, testing should include functional, integration, browser, and manual test cases.

## 19.2 Unit Testing Scope

Functions suitable for unit testing include question randomization, option order mapping, score calculation, negative marking, text normalization, plagiarism similarity, risk score calculation, and evidence data URL parsing.

## 19.3 Integration Testing Scope

Integration tests should verify registration and login, exam creation and retrieval, submission start, submission progress save, submission final submit, proctoring event logging, evidence upload and fetch, report aggregation, Python service health check, and Python frame analysis proxy.

## 19.4 Manual Testing

Manual testing is important because proctoring depends on browser permissions and real devices.

| Test Case | Expected Result |
| --- | --- |
| Login as admin | Admin dashboard opens |
| Login as student | Student dashboard opens |
| Create exam | Exam appears in exam list |
| Activate exam | Student can view exam |
| Start exam | Submission is created |
| Answer MCQ | Selected option is saved |
| Submit exam | Score is calculated |
| Switch tab | Tab switch event logged |
| Block copy paste | Clipboard action prevented |
| Turn camera away | Face missing event logged |
| Bring second person | Multiple faces event logged |
| Show mobile phone | Mobile detected event may be logged |
| Speak loudly | Audio event logged |
| Disconnect network | Network change metric updated |
| Python service off | Browser fallback activated |
| View report | Events and score are visible |

## 19.5 AI Testing

AI testing should be performed under different conditions such as good lighting, low lighting, different camera angles, candidate looking straight, candidate looking away, no face in frame, two faces in frame, mobile phone visible, and Python service unavailable.

The objective is not to guarantee perfect detection, but to verify that events are generated reasonably and fallback behavior works.

## 19.6 Security Testing

Security testing should verify that unauthenticated users cannot access private APIs, students cannot access admin reports, students cannot access other students' submissions, invalid submission ids are rejected, evidence access is restricted where required, and passwords are not returned by normal user queries.

## 19.7 Browser Compatibility Testing

The system should be tested in Google Chrome, Microsoft Edge, and Mozilla Firefox. Special attention should be given to webcam permission behavior, microphone access, fullscreen support, and MediaRecorder support.

## 19.8 Sample Test Report

| Module | Test Result | Remarks |
| --- | --- | --- |
| Authentication | Passed | Login and role session work |
| Exam CRUD | Passed | Exams can be created and listed |
| Student Exam | Passed | Timer and submission flow work |
| Proctoring Browser Events | Passed | Tab switch and shortcut events logged |
| Evidence Storage | Passed | Snapshots saved and fetched |
| AI Service Health | Passed | Health endpoint returns status |
| AI Frame Analysis | Passed with conditions | Depends on lighting and model status |
| Reports | Passed | Summary and detail data available |

---

# Chapter 20: Results And Discussion

## 20.1 Project Output

The final output of the project is a working web application called ProctorX. It supports remote exam creation, student exam attempts, AI assisted proctoring, evidence storage, risk scoring, result calculation, and reporting.

## 20.2 Functional Results

The system successfully provides user registration and login, role based dashboards, exam creation and management, student exam attempt flow, timer and auto submission, answer saving and scoring, proctoring event capture, evidence upload and retrieval, Python AI service integration, reports and analytics, and plagiarism flagging for descriptive answers.

## 20.3 Proctoring Results

The proctoring module can detect important suspicious events. Browser events such as tab switching, copy paste blocking, context menu blocking, restricted shortcuts, and network change detection are reliable because they use direct browser APIs.

Computer vision events depend on camera quality and model performance. Face missing and multiple face detection work better in clear lighting. Mobile phone detection depends on object visibility and confidence. Gaze detection gives an approximate score and should be reviewed carefully.

## 20.4 Reporting Results

Reports provide meaningful data for examiners. A submission report includes score and integrity information together. This is useful because a high score with many high severity proctoring events can be reviewed more carefully.

## 20.5 Discussion

The project demonstrates that online exam systems can be improved by combining normal exam workflow with AI assisted monitoring. The best approach is evidence based proctoring rather than blind automatic punishment. ProctorX logs suspicious events and provides details for review.

The project also shows the importance of fallback design. AI services may fail or become slow. Browser based monitoring ensures that basic integrity checks continue even if advanced models are unavailable.

## 20.6 Screenshots To Add In Word Report

When preparing the final Word document, add screenshots for login page, register page, admin dashboard, exam creation page, student dashboard, exam attempt page, proctoring overlay, report list page, submission detail page, Python service health response, and MongoDB collections.

---

# Chapter 21: Advantages

## 21.1 Main Advantages

- Provides a complete online exam workflow.
- Integrates AI based proctoring with exam delivery.
- Supports multiple user roles.
- Stores proctoring events with evidence.
- Computes risk score for review.
- Provides browser fallback if Python AI service fails.
- Supports MCQ and descriptive questions.
- Supports randomized question and option order.
- Supports negative marking.
- Provides plagiarism checking for descriptive answers.
- Uses open source technologies.
- Can run locally or through Docker Compose.
- Modular architecture supports future expansion.

## 21.2 Academic Advantages

The project demonstrates full stack development, AI service integration, database schema design, authentication and authorization, real time browser event handling, computer vision usage, reporting, analytics, and technical documentation.

## 21.3 Institutional Advantages

ProctorX can help institutions conduct remote exams, reduce need for physical invigilation, provide evidence based review, give examiners better visibility into suspicious attempts, and customize workflows for academic requirements.

---

# Chapter 22: Limitations

## 22.1 Technical Limitations

- Detection accuracy depends on webcam quality.
- Poor lighting may affect face detection.
- AI models can produce false positives and false negatives.
- Browser permissions can be denied by the user.
- Some browser APIs behave differently across browsers.
- Python AI service may require heavy dependencies.
- Evidence storage can grow quickly for many students.
- The system currently does not include full screen recording.

## 22.2 Operational Limitations

- Students need a webcam and microphone.
- Stable internet is required.
- Human review is still needed for flagged submissions.
- Institutions must define privacy and consent policies.
- The system requires proper configuration before exams.

## 22.3 AI Limitations

Face recognition may be affected by angle, lighting, glasses, masks, or camera blur. Gaze estimation is approximate. Mobile phone detection may miss small or partially hidden phones. Background objects may sometimes look like phones. Audio detection cannot fully understand context.

## 22.4 Security Limitations

A web based system cannot fully control the entire computer without a secure browser. Advanced users may attempt to bypass browser restrictions. Standard browser mode has lower trust than secure exam browser mode.

---

# Chapter 23: Future Enhancements

## 23.1 Advanced AI Models

Future versions can integrate more accurate face recognition, liveness detection, head pose estimation, and object detection models. Model performance can be improved by using better training data and GPU acceleration.

## 23.2 Live Admin Monitoring

A real time monitoring dashboard can be added using WebSockets. Admins could view currently active exams, live risk scores, and recent events.

## 23.3 Screen Recording

Screen recording can provide stronger evidence. Browser screen capture APIs can be used with student consent.

## 23.4 Secure Browser Integration

Deeper integration with Safe Exam Browser can improve control over browser features, external applications, and system level restrictions.

## 23.5 LMS Integration

The system can integrate with learning management systems such as Moodle, Google Classroom, or institutional portals. Grades can be exported automatically.

## 23.6 Advanced Plagiarism Detection

The current plagiarism checking is heuristic. Future work can add semantic similarity, embeddings, document comparison, and external plagiarism APIs.

## 23.7 Cloud Storage For Evidence

Evidence can be stored in cloud object storage such as AWS S3, Azure Blob Storage, or Google Cloud Storage instead of MongoDB buffers.

## 23.8 Notification System

Email or dashboard notifications can inform examiners about flagged submissions.

## 23.9 Audit Logs

Detailed audit logs can track administrative actions such as exam creation, changes, deletion, and report review.

## 23.10 Question Bank

A reusable question bank can help examiners create exams faster by selecting questions from categories and difficulty levels.

---

# Chapter 24: Conclusion

ProctorX is a full stack AI powered online exam proctoring system developed to address the challenges of remote examination integrity. The project combines exam management, student exam delivery, browser monitoring, webcam based AI analysis, audio detection, evidence storage, risk scoring, plagiarism checking, and administrative reporting.

The system demonstrates how modern web technologies and artificial intelligence can be integrated to create a practical remote assessment platform. Next.js and React provide a responsive web interface, MongoDB stores flexible exam and submission data, NextAuth manages secure authentication, and Python FastAPI provides computer vision based analysis. The modular architecture allows each part of the system to be maintained and enhanced independently.

The project also emphasizes fairness and reviewability. Instead of treating AI output as final judgement, ProctorX stores suspicious events, confidence values, evidence, and session metrics. This enables examiners to make informed decisions after reviewing the context. The fallback strategy ensures that basic monitoring continues even when the Python AI service is unavailable.

Overall, ProctorX satisfies the main objectives of a major project by solving a real world problem, using multiple technologies, demonstrating system design, implementing meaningful functionality, and providing scope for future development. It can be extended into a stronger institutional platform with live monitoring, secure browser integration, advanced AI models, cloud storage, and LMS integration.

---

# Chapter 25: References

1. Next.js Documentation: https://nextjs.org/docs
2. React Documentation: https://react.dev
3. TypeScript Documentation: https://www.typescriptlang.org/docs
4. Tailwind CSS Documentation: https://tailwindcss.com/docs
5. MongoDB Documentation: https://www.mongodb.com/docs
6. Mongoose Documentation: https://mongoosejs.com/docs
7. NextAuth Documentation: https://next-auth.js.org
8. FastAPI Documentation: https://fastapi.tiangolo.com
9. OpenCV Documentation: https://docs.opencv.org
10. MediaPipe Documentation: https://developers.google.com/mediapipe
11. DeepFace Repository: https://github.com/serengil/deepface
12. Ultralytics YOLO Documentation: https://docs.ultralytics.com
13. TensorFlow Documentation: https://www.tensorflow.org
14. MDN Web Docs for Browser APIs: https://developer.mozilla.org
15. Docker Documentation: https://docs.docker.com

---

# Chapter 26: Appendices

## Appendix A: Installation Steps

### Local Setup

```bash
npm install
npm run setup:face-models
python -m pip install -r python/requirements.txt
cp .env.local.example .env.local
npx tsx scripts/seed.ts
npm run dev
npm run proctoring:python
```

### Docker Setup

```bash
cp .env.docker.example .env.docker
docker compose up --build -d
docker compose --profile seed run --rm seed
```

## Appendix B: Default Seed Credentials

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@proctorx.dev | admin123 |
| Examiner | examiner@proctorx.dev | exam123 |
| Student | student@proctorx.dev | student123 |

## Appendix C: Important Commands

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run setup:face-models
npm run proctoring:python
docker compose up --build -d
docker compose logs -f web
docker compose logs -f python-ai
docker compose down
```

## Appendix D: Sample Environment File

```env
MONGODB_URI=mongodb://localhost:27017/proctorx
NEXTAUTH_SECRET=generate-a-strong-secret
NEXTAUTH_URL=http://localhost:3000
PYTHON_PROCTORING_URL=http://127.0.0.1:8001
PYTHON_PROCTORING_TIMEOUT_MS=15000
```

## Appendix E: Sample Proctoring Event

```json
{
  "type": "multiple_faces",
  "severity": "high",
  "details": "Multiple faces detected by Python face counter",
  "timestamp": "2026-04-16T10:00:00.000Z",
  "source": "python",
  "confidence": 0.8,
  "detectorDetails": {
    "sourceMode": "python_primary",
    "faceCount": 2,
    "detector": "hybrid_face_count_tiled"
  }
}
```

## Appendix F: Sample AI Analysis Response

```json
{
  "analysis_ok": true,
  "faces_count": 1,
  "identity_distance": 0.24,
  "gaze_offscreen_score": 0.12,
  "mobile_detected": false,
  "mobile_confidence": 0.0,
  "model_status": "face_cascade,deepface_facenet,mediapipe,yolo_phone",
  "latency_ms": 542,
  "service_status": "healthy"
}
```

## Appendix G: Sample Use Case Diagram Description

Actors are Admin, Examiner, Student, and AI Service. Main use cases are register and login, manage users, create exam, activate exam, attempt exam, monitor exam, submit answers, store evidence, analyze frame, view reports, and review flagged submission.

## Appendix H: Sample Data Flow Description

1. Student sends login credentials.
2. Authentication module validates credentials.
3. Student requests active exam list.
4. Student starts exam.
5. Submission is created.
6. Proctoring module captures events.
7. AI service analyzes frames.
8. Evidence module stores snapshots.
9. Student submits answers.
10. Report module displays result and integrity data.

## Appendix I: Sample ER Diagram Description

Entities are User, Exam, Question, Submission, Answer, ProctoringEvent, EvidenceBlob, RecordingClip, and PlagiarismFlag. One user can create many exams. One exam can have many questions. One student can have many submissions. One exam can have many submissions. One submission can have many answers, proctoring events, evidence blobs, recording clips, and plagiarism flags.

## Appendix J: Viva Questions And Answers

### 1. What is ProctorX?

ProctorX is an AI powered online examination and proctoring system that allows students to attempt exams remotely while the system monitors suspicious behavior and stores evidence for review.

### 2. Which technologies are used?

The project uses Next.js, React, TypeScript, Tailwind CSS, MongoDB, Mongoose, NextAuth, Python, FastAPI, OpenCV, MediaPipe, DeepFace, YOLO, and Docker.

### 3. Why is MongoDB used?

MongoDB is used because the project stores nested and flexible data such as questions, answers, proctoring events, session metrics, evidence references, and plagiarism flags.

### 4. What is the purpose of the Python service?

The Python service analyzes webcam frames and returns face count, identity distance, gaze score, mobile phone detection status, confidence, model status, and latency.

### 5. What happens if Python service fails?

The system activates browser fallback mode. Browser based monitoring continues and the session metrics record that Python fallback is active.

### 6. How is cheating detected?

The system logs suspicious indicators such as tab switching, missing face, multiple faces, mobile phone detection, audio detection, identity mismatch, print screen attempt, and restricted shortcut usage.

### 7. Does the system automatically fail students?

No. The system flags suspicious submissions and stores evidence for examiner review. This reduces unfair automatic judgement.

### 8. How is score calculated?

MCQ answers are compared with correct answers. Correct answers add marks. If negative marking is enabled, wrong answers reduce marks. Percentage and pass or fail status are calculated after submission.

### 9. How is plagiarism detected?

Descriptive answers are normalized and compared against known copied patterns and previous submissions using token overlap similarity.

### 10. What are future improvements?

Future improvements include live monitoring, screen recording, secure browser integration, advanced AI models, cloud evidence storage, LMS integration, and semantic plagiarism detection.

## Appendix K: Glossary

| Term | Meaning |
| --- | --- |
| Proctoring | Monitoring a candidate during an exam |
| Risk Score | Numeric value representing suspicious activity level |
| Evidence | Snapshot or clip stored for review |
| AI Service | Python service that analyzes webcam frames |
| Fallback | Browser monitoring mode used when Python is unavailable |
| Submission | A student's exam attempt record |
| Face Embedding | Numeric representation of a face used for comparison |
| Gaze Score | Approximate score indicating whether candidate is looking away |
| Secure Browser | Browser mode that restricts exam environment |
| Plagiarism Flag | Indicator of suspicious text similarity |

## Appendix L: Suggested Word Formatting

For final Word report preparation, use Times New Roman or Calibri, 12 pt font for body text, 14 or 16 pt bold font for chapter headings, 1.5 line spacing, justified alignment for paragraphs, page numbers in the footer, screenshots after relevant chapters, architecture and data flow diagrams, Word heading styles for the table of contents, and references at the end.

