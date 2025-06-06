-- Mock Training Data for Story Point Estimation
-- Contains diverse tasks with different story points for AI training

-- 1 Point Tasks (Simple UI/Text Changes)
INSERT INTO tasks (id, project_id, title, description, status, story_point, priority, tags, created_at) VALUES
(uuid_generate_v4(), 'project-id-1', 'Update login button color', 
'Change the login button color from blue to green to match our new brand guidelines. Update the CSS class in the login component.', 
'DONE', 1, 'LOW', ARRAY['FRONTEND'], NOW()),

(uuid_generate_v4(), 'project-id-1', 'Fix typo in error message', 
'Correct the spelling mistake in the password validation error message from "passsword" to "password".', 
'DONE', 1, 'LOWEST', ARRAY['BUG'], NOW()),

(uuid_generate_v4(), 'project-id-1', 'Update copyright year', 
'Update the copyright year in the footer from 2023 to 2024. This needs to be changed in the Footer component.', 
'DONE', 1, 'LOW', ARRAY['FRONTEND'], NOW()),

(uuid_generate_v4(), 'project-id-1', 'Add missing alt text', 
'Add alt text to the company logo image in the header for better accessibility. The alt text should be "Company Name Logo".', 
'DONE', 1, 'LOW', ARRAY['FRONTEND'], NOW()),

(uuid_generate_v4(), 'project-id-1', 'Fix broken link', 
'Fix the broken link in the footer that points to the privacy policy page. Update href to "/privacy-policy".', 
'DONE', 1, 'LOW', ARRAY['BUG'], NOW());

-- 2 Point Tasks (Small Features/Fixes)
INSERT INTO tasks (id, project_id, title, description, status, story_point, priority, tags, created_at) VALUES
(uuid_generate_v4(), 'project-id-1', 'Add email validation', 
'Implement email format validation on the registration form. Show error message for invalid email formats. Use regex pattern for validation.', 
'DONE', 2, 'MEDIUM', ARRAY['FRONTEND', 'FEATURE'], NOW()),

(uuid_generate_v4(), 'project-id-1', 'Implement password strength indicator', 
'Add a visual password strength indicator on the signup form. Show different colors based on password complexity (red for weak, yellow for medium, green for strong).', 
'DONE', 2, 'MEDIUM', ARRAY['FRONTEND', 'FEATURE'], NOW()),

(uuid_generate_v4(), 'project-id-1', 'Add loading spinner', 
'Add a loading spinner component to show during API calls. Implement in the shared components folder and use it across all async operations.', 
'DONE', 2, 'LOW', ARRAY['FRONTEND', 'FEATURE'], NOW()),

(uuid_generate_v4(), 'project-id-1', 'Fix mobile menu alignment', 
'Fix the alignment issues in the mobile navigation menu. Menu items are currently overlapping on iPhone devices. Adjust the padding and flex layout.', 
'DONE', 2, 'MEDIUM', ARRAY['FRONTEND', 'BUG'], NOW()),

(uuid_generate_v4(), 'project-id-1', 'Add input field validation', 
'Add client-side validation for all input fields in the contact form. Show appropriate error messages and disable submit button until valid.', 
'DONE', 2, 'MEDIUM', ARRAY['FRONTEND', 'FEATURE'], NOW());

-- 3 Point Tasks (Standard Features)
INSERT INTO tasks (id, project_id, title, description, status, story_point, priority, tags, created_at) VALUES
(uuid_generate_v4(), 'project-id-1', 'Implement remember me functionality', 
'Add remember me checkbox in login form. Store token in localStorage if checked, sessionStorage if not. Update auth service to handle persistent login.', 
'DONE', 3, 'MEDIUM', ARRAY['FRONTEND', 'BACKEND', 'FEATURE'], NOW()),

(uuid_generate_v4(), 'project-id-1', 'Create error boundary component', 
'Implement a global error boundary component to catch and display runtime errors. Include error logging service integration and user-friendly error messages.', 
'DONE', 3, 'MEDIUM', ARRAY['FRONTEND', 'FEATURE'], NOW()),

(uuid_generate_v4(), 'project-id-1', 'Add pagination to users table', 
'Implement server-side pagination for the users table. Add page size selector, page navigation, and maintain state in URL parameters.', 
'DONE', 3, 'MEDIUM', ARRAY['FRONTEND', 'BACKEND', 'FEATURE'], NOW()),

(uuid_generate_v4(), 'project-id-1', 'Implement sort functionality', 
'Add sorting capability to all table columns. Update API to handle sort parameters. Show sort indicators in column headers.', 
'DONE', 3, 'MEDIUM', ARRAY['FRONTEND', 'BACKEND', 'FEATURE'], NOW()),

(uuid_generate_v4(), 'project-id-1', 'Create toast notification system', 
'Implement a reusable toast notification system. Support different types (success, error, warning, info) with customizable duration and styling.', 
'DONE', 3, 'MEDIUM', ARRAY['FRONTEND', 'FEATURE'], NOW());

-- 5 Point Tasks (Complex Features)
INSERT INTO tasks (id, project_id, title, description, status, story_point, priority, tags, created_at) VALUES
(uuid_generate_v4(), 'project-id-1', 'Implement file upload with preview', 
'Create a file upload component with drag & drop support, preview functionality for images, progress bar, and validation for file types and sizes. Handle multiple file uploads.', 
'DONE', 5, 'HIGH', ARRAY['FRONTEND', 'BACKEND', 'FEATURE'], NOW()),

(uuid_generate_v4(), 'project-id-1', 'Add role-based access control', 
'Implement RBAC system. Create roles and permissions management UI. Update API endpoints to check permissions. Add role assignment functionality.', 
'DONE', 5, 'HIGH', ARRAY['FRONTEND', 'BACKEND', 'FEATURE'], NOW()),

(uuid_generate_v4(), 'project-id-1', 'Create dashboard analytics', 
'Build analytics dashboard with charts for user activity, system usage, and key metrics. Implement data aggregation API and real-time updates.', 
'DONE', 5, 'HIGH', ARRAY['FRONTEND', 'BACKEND', 'FEATURE'], NOW()),

(uuid_generate_v4(), 'project-id-1', 'Implement export functionality', 
'Add export feature for all data tables. Support multiple formats (CSV, Excel, PDF). Handle large datasets with background processing.', 
'DONE', 5, 'HIGH', ARRAY['FRONTEND', 'BACKEND', 'FEATURE'], NOW()),

(uuid_generate_v4(), 'project-id-1', 'Add advanced search filters', 
'Implement advanced search with multiple filters, date ranges, and custom fields. Create filter builder UI and update API to handle complex queries.', 
'DONE', 5, 'HIGH', ARRAY['FRONTEND', 'BACKEND', 'FEATURE'], NOW());

-- 8 Point Tasks (Complex Integration Features)
INSERT INTO tasks (id, project_id, title, description, status, story_point, priority, tags, created_at) VALUES
(uuid_generate_v4(), 'project-id-1', 'Implement real-time notifications', 
'Create WebSocket-based notification system. Handle different notification types, user preferences, and notification center UI. Implement push notifications for mobile.', 
'DONE', 8, 'HIGH', ARRAY['FRONTEND', 'BACKEND', 'FEATURE'], NOW()),

(uuid_generate_v4(), 'project-id-1', 'Add OAuth integration', 
'Implement OAuth2 authentication with multiple providers (Google, GitHub, Microsoft). Handle user profile mapping and account linking.', 
'DONE', 8, 'HIGH', ARRAY['FRONTEND', 'BACKEND', 'FEATURE'], NOW()),

(uuid_generate_v4(), 'project-id-1', 'Create workflow engine', 
'Build customizable workflow engine for task automation. Include workflow designer UI, execution engine, and monitoring dashboard.', 
'DONE', 8, 'HIGHEST', ARRAY['FRONTEND', 'BACKEND', 'FEATURE'], NOW()),

(uuid_generate_v4(), 'project-id-1', 'Implement document collaboration', 
'Add real-time document collaboration feature with operational transformation. Include presence indicators and change tracking.', 
'DONE', 8, 'HIGH', ARRAY['FRONTEND', 'BACKEND', 'FEATURE'], NOW()),

(uuid_generate_v4(), 'project-id-1', 'Add report generator', 
'Create flexible report generator with custom templates, scheduling, and multiple output formats. Include visual report builder.', 
'DONE', 8, 'HIGH', ARRAY['FRONTEND', 'BACKEND', 'FEATURE'], NOW());

-- 13 Point Tasks (Large System Features)
INSERT INTO tasks (id, project_id, title, description, status, story_point, priority, tags, created_at) VALUES
(uuid_generate_v4(), 'project-id-1', 'Implement multi-tenant architecture', 
'Convert application to multi-tenant architecture. Include tenant isolation, custom domains, and tenant-specific configurations. Update database schema and API layer.', 
'DONE', 13, 'HIGHEST', ARRAY['BACKEND', 'FEATURE'], NOW()),

(uuid_generate_v4(), 'project-id-1', 'Create workflow automation system', 
'Build comprehensive workflow automation system with visual designer, custom actions, conditional logic, and integration capabilities. Include testing and debugging tools.', 
'DONE', 13, 'HIGHEST', ARRAY['FRONTEND', 'BACKEND', 'FEATURE'], NOW()),

(uuid_generate_v4(), 'project-id-1', 'Add AI-powered analytics', 
'Implement AI/ML-based analytics system. Include predictive analytics, anomaly detection, and automated insights generation. Create visualization dashboard.', 
'DONE', 13, 'HIGHEST', ARRAY['FRONTEND', 'BACKEND', 'FEATURE'], NOW());

-- 21 Point Tasks (Major System Changes)
INSERT INTO tasks (id, project_id, title, description, status, story_point, priority, tags, created_at) VALUES
(uuid_generate_v4(), 'project-id-1', 'Migrate to microservices architecture', 
'Break down monolithic application into microservices. Include service discovery, API gateway, and distributed logging. Update deployment and monitoring infrastructure.', 
'DONE', 21, 'HIGHEST', ARRAY['BACKEND', 'DEVOPS', 'FEATURE'], NOW()),

(uuid_generate_v4(), 'project-id-1', 'Implement distributed caching system', 
'Design and implement distributed caching system with cache invalidation, consistency protocols, and monitoring. Include fallback mechanisms and cache warming strategies.', 
'DONE', 21, 'HIGHEST', ARRAY['BACKEND', 'DEVOPS', 'FEATURE'], NOW()); 