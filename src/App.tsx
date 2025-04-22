import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import ProfileView from './components/profile/ProfileView';
import ProfileEditForm from './components/profile/ProfileEditForm';
import ProjectsList from './components/projects/ProjectsList';
import ProjectCreateForm from './components/projects/ProjectCreateForm';
import ProjectEditForm from './components/projects/ProjectEditForm';
import ProjectDetailView from './components/projects/ProjectDetailView';
import ApiKeySettings from './components/settings/ApiKeySettings';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Task components
import TasksList from './components/tasks/TasksList';
import TaskCreateForm from './components/tasks/TaskCreateForm';
import TaskEditForm from './components/tasks/TaskEditForm';
import TaskDetailView from './components/tasks/TaskDetailView';
import ProjectTasksView from './components/tasks/ProjectTasksView';

// Inventory components
import InventoryList from './components/inventory/InventoryList';
import InventoryItemCreateForm from './components/inventory/InventoryItemCreateForm';
import InventoryItemEditForm from './components/inventory/InventoryItemEditForm';
import InventoryItemDetailView from './components/inventory/InventoryItemDetailView';
import ProjectInventoryView from './components/inventory/ProjectInventoryView';

// Calendar components
import CalendarView from './components/calendar/CalendarView';
import EventCreateForm from './components/calendar/EventCreateForm';
import EventEditForm from './components/calendar/EventEditForm';
import EventDetailView from './components/calendar/EventDetailView';
import ProjectCalendarView from './components/calendar/ProjectCalendarView';

// Badge components
import BadgesList from './components/badges/BadgesList';
import BadgeCreateForm from './components/badges/BadgeCreateForm';
import BadgeEditForm from './components/badges/BadgeEditForm';
import BadgeDetailView from './components/badges/BadgeDetailView';
import UserBadgesView from './components/badges/UserBadgesView';

// Badge Quest components
import BadgeQuestsList from './components/badges/BadgeQuestsList';
import BadgeQuestCreateForm from './components/badges/BadgeQuestCreateForm';
import BadgeQuestEditForm from './components/badges/BadgeQuestEditForm';
import BadgeQuestDetailView from './components/badges/BadgeQuestDetailView';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/projects" />} />
            <Route path="login" element={<LoginForm />} />
            <Route path="register" element={<RegisterForm />} />
            
            <Route 
              path="profile" 
              element={
                <ProtectedRoute>
                  <ProfileView />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="profile/edit" 
              element={
                <ProtectedRoute>
                  <ProfileEditForm />
                </ProtectedRoute>
              } 
            />

            {/* Projects Routes */}
            <Route 
              path="projects" 
              element={
                <ProtectedRoute>
                  <ProjectsList />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="projects/new" 
              element={
                <ProtectedRoute>
                  <ProjectCreateForm />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="projects/:id" 
              element={
                <ProtectedRoute>
                  <ProjectDetailView projectId=":id" />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="projects/edit/:id" 
              element={
                <ProtectedRoute>
                  <ProjectEditForm />
                </ProtectedRoute>
              } 
            />

            {/* Tasks Routes */}
            <Route 
              path="tasks" 
              element={
                <ProtectedRoute>
                  <TasksList />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="tasks/new" 
              element={
                <ProtectedRoute>
                  <TaskCreateForm />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="tasks/:id" 
              element={
                <ProtectedRoute>
                  <TaskDetailView />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="tasks/edit/:id" 
              element={
                <ProtectedRoute>
                  <TaskEditForm />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="projects/:id/tasks" 
              element={
                <ProtectedRoute>
                  <ProjectTasksView />
                </ProtectedRoute>
              } 
            />

            {/* Inventory Routes */}
            <Route 
              path="inventory" 
              element={
                <ProtectedRoute>
                  <InventoryList />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="inventory/new" 
              element={
                <ProtectedRoute>
                  <InventoryItemCreateForm />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="inventory/:id" 
              element={
                <ProtectedRoute>
                  <InventoryItemDetailView />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="inventory/edit/:id" 
              element={
                <ProtectedRoute>
                  <InventoryItemEditForm />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="projects/:id/inventory" 
              element={
                <ProtectedRoute>
                  <ProjectInventoryView />
                </ProtectedRoute>
              } 
            />

            {/* Calendar Routes */}
            <Route 
              path="calendar" 
              element={
                <ProtectedRoute>
                  <CalendarView />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="events/new" 
              element={
                <ProtectedRoute>
                  <EventCreateForm />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="events/:id" 
              element={
                <ProtectedRoute>
                  <EventDetailView />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="events/edit/:id" 
              element={
                <ProtectedRoute>
                  <EventEditForm />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="projects/:id/calendar" 
              element={
                <ProtectedRoute>
                  <ProjectCalendarView />
                </ProtectedRoute>
              } 
            />

            {/* Badges Routes */}
            <Route 
              path="badges" 
              element={
                <ProtectedRoute>
                  <BadgesList />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="badges/new" 
              element={
                <ProtectedRoute>
                  <BadgeCreateForm />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="badges/:id" 
              element={
                <ProtectedRoute>
                  <BadgeDetailView />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="badges/edit/:id" 
              element={
                <ProtectedRoute>
                  <BadgeEditForm />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="user-badges" 
              element={
                <ProtectedRoute>
                  <UserBadgesView />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="user-badges/:userId" 
              element={
                <ProtectedRoute>
                  <UserBadgesView />
                </ProtectedRoute>
              } 
            />

            {/* Badge Quests Routes */}
            <Route 
              path="badge-quests" 
              element={
                <ProtectedRoute>
                  <BadgeQuestsList />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="badge-quests/new" 
              element={
                <ProtectedRoute>
                  <BadgeQuestCreateForm />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="badge-quests/:id" 
              element={
                <ProtectedRoute>
                  <BadgeQuestDetailView />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="badge-quests/edit/:id" 
              element={
                <ProtectedRoute>
                  <BadgeQuestEditForm />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="settings/api-keys" 
              element={
                <ProtectedRoute>
                  <ApiKeySettings />
                </ProtectedRoute>
              } 
            />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;