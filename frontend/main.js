// Task Management System
class Task {
    constructor(id, title, description, deadline, priority, project = 'Inbox') {
        this.id = id;
        this.title = title;
        this.description = description;
        this.deadline = deadline;
        this.priority = priority;
        this.project = project;
        this.completed = false;
    }
}

// Authentication Check
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/sign-in';
        return false;
    }
    return true;
}

// Add Authorization header to fetch requests
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}

// Logout function
function logout() {
    // Clear all data from localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('projectColors');
    localStorage.removeItem('projects');
    localStorage.removeItem('tasks');
    
    // Redirect to sign-in page
    window.location.href = '../frontend/sign-in/sign-in.html';
}

class TaskManager {
    constructor() {
        if (!checkAuth()) return;
        
        this.tasks = [];
        this.projects = ['Inbox'];
        this.currentView = 'inbox';
        this.currentProject = 'Inbox';
        this.initializeEventListeners();
        this.loadTasks();
        this.renderProjects();
        this.loadUserData();
    }

    async loadTasks() {
        try {
            const response = await fetch('/api/tasks', {
                headers: getAuthHeaders()
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    logout();
                    return;
                }
                throw new Error('Failed to load tasks');
            }

            this.tasks = await response.json();
            this.renderTasks();
            
            // Update projects list - filter out 'Inbox' since it's already in defaults
            const uniqueProjects = new Set(this.tasks.map(task => task.project));
            uniqueProjects.delete('Inbox'); // Remove Inbox from the set
            this.projects = ['Inbox', ...Array.from(uniqueProjects)];
            this.renderProjects();
        } catch (error) {
            console.error('Error loading tasks:', error);
        }
    }

    async addTask(title, description, deadline, priority, project) {
        try {
            const response = await fetch('/api/tasks', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    title,
                    description,
                    deadline,
                    priority,
                    project
                })
            });

            if (!response.ok) throw new Error('Failed to add task');
            
            const newTask = await response.json();
            this.tasks.push(newTask);
            this.renderTasks();
            
            if (!this.projects.includes(project)) {
                this.projects.push(project);
                this.renderProjects();
            }
            
            this.hideAddTaskForm();
        } catch (error) {
            console.error('Error adding task:', error);
        }
    }

    async toggleTaskComplete(taskId) {
        try {
            const task = this.tasks.find(t => t._id === taskId);
            if (!task) return;

            const response = await fetch(`/api/tasks/${taskId}`, {
                method: 'PATCH',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    completed: !task.completed
                })
            });

            if (!response.ok) throw new Error('Failed to update task');

            const updatedTask = await response.json();
            const index = this.tasks.findIndex(t => t._id === taskId);
            this.tasks[index] = updatedTask;
            this.renderTasks();
        } catch (error) {
            console.error('Error updating task:', error);
        }
    }

    async deleteTask(taskId) {
        try {
            const response = await fetch(`/api/tasks/${taskId}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });

            if (!response.ok) throw new Error('Failed to delete task');

            this.tasks = this.tasks.filter(task => task._id !== taskId);
            this.renderTasks();
        } catch (error) {
            console.error('Error deleting task:', error);
        }
    }

    async updateTask(taskId, updates) {
        try {
            const response = await fetch(`/api/tasks/${taskId}`, {
                method: 'PATCH',
                headers: getAuthHeaders(),
                body: JSON.stringify(updates)
            });

            if (!response.ok) throw new Error('Failed to update task');

            const updatedTask = await response.json();
            const index = this.tasks.findIndex(t => t._id === taskId);
            this.tasks[index] = updatedTask;
            this.renderTasks();
            this.hideAddTaskForm();
        } catch (error) {
            console.error('Error updating task:', error);
        }
    }

    initializeEventListeners() {
        // Navigation
        document.querySelectorAll('.main-nav li').forEach(item => {
            if (item.classList.contains('logout-nav')) {
                item.addEventListener('click', logout);
            } else {
                item.addEventListener('click', (e) => {
                    this.handleNavigation(e.currentTarget);
                });
            }
        });

        // Add Task Button
        const addTaskBtn = document.querySelector('.add-task-button');
        addTaskBtn.addEventListener('click', () => this.showAddTaskForm());

        // Task Actions
        document.querySelector('.task-list').addEventListener('click', (e) => {
            if (e.target.classList.contains('task-checkbox')) {
                const taskId = e.target.closest('.task-item').dataset.taskId;
                this.toggleTaskComplete(taskId);
            }
        });

        // Sort Button
        const sortBtn = document.querySelector('.sort-button');
        sortBtn.addEventListener('click', () => this.showSortOptions());

        // Search Input
        const searchInput = document.getElementById('search-input');
        searchInput.addEventListener('input', this.debounce(() => {
            this.searchTasks(searchInput.value);
        }, 300));

        // Add Project Button
        const addProjectBtn = document.querySelector('.add-project');
        addProjectBtn.addEventListener('click', () => this.showAddProjectForm());

        // Project List Click Events
        document.querySelector('.project-list').addEventListener('click', (e) => {
            const projectItem = e.target.closest('li');
            if (projectItem) {
                const projectName = projectItem.dataset.project;
                if (e.target.classList.contains('delete-project')) {
                    this.deleteProject(projectName);
                } else {
                    this.selectProject(projectName);
                }
            }
        });

        // Add logout button event listener
        const logoutBtn = document.querySelector('.logout-button');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', logout);
        }
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    searchTasks(query) {
        const normalizedQuery = query.toLowerCase().trim();
        
        if (!normalizedQuery) {
            this.renderTasks();
            return;
        }

        const filteredTasks = this.tasks.filter(task => {
            const searchableText = `
                ${task.title}
                ${task.description}
                ${task.project}
                ${task.priority}
            `.toLowerCase();

            return searchableText.includes(normalizedQuery);
        });

        this.renderFilteredTasks(filteredTasks, normalizedQuery);
    }

    renderFilteredTasks(filteredTasks, query) {
        const taskList = document.querySelector('.task-list');
        taskList.innerHTML = '';

        if (filteredTasks.length === 0) {
            taskList.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <p>No tasks found matching "${query}"</p>
                </div>`;
            return;
        }

        filteredTasks.forEach(task => {
            const taskElement = document.createElement('div');
            taskElement.className = 'task-item';
            taskElement.dataset.taskId = task._id;

            const priorityClass = `priority-${task.priority}`;
            const titleWithHighlight = this.highlightText(task.title, query);
            const descriptionWithHighlight = this.highlightText(task.description, query);
            
            taskElement.innerHTML = `
                <div class="task-checkbox ${task.completed ? 'checked' : ''}"></div>
                <div class="task-content">
                    <div class="task-text ${priorityClass}">${titleWithHighlight}</div>
                    <div class="task-details">
                        <span class="task-project">${task.project}</span>
                        <span class="task-date">${task.deadline}</span>
                        <span class="task-priority">${task.priority}</span>
                    </div>
                    <div class="task-description">${descriptionWithHighlight}</div>
                </div>
                <div class="task-actions">
                    <button class="edit-task"><i class="fas fa-edit"></i></button>
                    <button class="delete-task"><i class="fas fa-trash"></i></button>
                </div>`;

            taskList.appendChild(taskElement);

            // Add event listeners for edit and delete buttons
            taskElement.querySelector('.edit-task').addEventListener('click', () => 
                this.editTask(task._id));
            taskElement.querySelector('.delete-task').addEventListener('click', () => 
                this.deleteTask(task._id));
        });
    }

    highlightText(text, query) {
        if (!text) return '';
        const normalizedText = text.toLowerCase();
        const normalizedQuery = query.toLowerCase();
        
        if (!normalizedText.includes(normalizedQuery)) return text;

        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<span class="highlight">$1</span>');
    }

    handleNavigation(navItem) {
        // Remove active class from all nav items
        document.querySelectorAll('.main-nav li').forEach(item => {
            item.classList.remove('active');
        });

        // Add active class to clicked item
        navItem.classList.add('active');

        // Update view and header
        const view = navItem.textContent.trim().toLowerCase();
        this.currentView = view;
        document.querySelector('.header-left h1').textContent = 
            view.charAt(0).toUpperCase() + view.slice(1);

        this.renderTasks();
    }

    showAddTaskForm() {
        const formHTML = `
            <div class="task-form">
                <input type="text" id="task-title" placeholder="Task title" class="task-input">
                <textarea id="task-description" placeholder="Description" class="task-input"></textarea>
                <input type="date" id="task-deadline" class="task-input">
                <select id="task-priority" class="task-input">
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                </select>
                <select id="task-project" class="task-input">
                    <option value="Inbox">Inbox</option>
                    ${this.projects.map(project => `<option value="${project}">${project}</option>`).join('')}
                </select>
                <div class="form-buttons">
                    <button id="save-task" class="save-btn">Save Task</button>
                    <button id="cancel-task" class="cancel-btn">Cancel</button>
                </div>
            </div>`;

        const formContainer = document.createElement('div');
        formContainer.className = 'task-form-container';
        formContainer.innerHTML = formHTML;
        document.querySelector('.add-task').insertAdjacentElement('afterend', formContainer);

        // Add event listeners for the form
        document.getElementById('save-task').addEventListener('click', () => this.addTask(
            document.getElementById('task-title').value,
            document.getElementById('task-description').value,
            document.getElementById('task-deadline').value,
            document.getElementById('task-priority').value,
            document.getElementById('task-project').value
        ));
        document.getElementById('cancel-task').addEventListener('click', () => this.hideAddTaskForm());
    }

    hideAddTaskForm() {
        const form = document.querySelector('.task-form-container');
        if (form) form.remove();
    }

    async editTask(taskId) {
        const task = this.tasks.find(t => t._id === taskId);
        if (!task) return;

        this.showAddTaskForm();
        
        // Format the date to YYYY-MM-DD for the input field
        const date = new Date(task.deadline);
        const formattedDate = date.toISOString().split('T')[0];
        
        // Fill the form with task data
        document.getElementById('task-title').value = task.title;
        document.getElementById('task-description').value = task.description;
        document.getElementById('task-deadline').value = formattedDate;
        document.getElementById('task-priority').value = task.priority;
        document.getElementById('task-project').value = task.project;

        // Update save button to handle edit
        const saveBtn = document.getElementById('save-task');
        saveBtn.textContent = 'Update Task';
        
        // Remove previous event listeners
        const oldSaveBtn = saveBtn.cloneNode(true);
        saveBtn.parentNode.replaceChild(oldSaveBtn, saveBtn);
        
        // Add new event listener for update
        oldSaveBtn.addEventListener('click', () => {
            this.updateTask(taskId, {
                title: document.getElementById('task-title').value,
                description: document.getElementById('task-description').value,
                deadline: document.getElementById('task-deadline').value,
                priority: document.getElementById('task-priority').value,
                project: document.getElementById('task-project').value
            });
        });
    }

    showAddProjectForm() {
        const existingForm = document.querySelector('.project-form-container');
        if (existingForm) {
            existingForm.remove();
            return;
        }

        const formHTML = `
            <div class="project-form">
                <input type="text" id="project-name" placeholder="Project name" class="project-input">
                <input type="color" id="project-color" value="#ff7b54" class="project-color-input">
                <div class="form-buttons">
                    <button id="save-project" class="save-btn">Add Project</button>
                    <button id="cancel-project" class="cancel-btn">Cancel</button>
                </div>
            </div>`;

        const formContainer = document.createElement('div');
        formContainer.className = 'project-form-container';
        formContainer.innerHTML = formHTML;

        const projectsList = document.querySelector('.project-list');
        projectsList.insertAdjacentElement('beforebegin', formContainer);

        // Add event listeners
        document.getElementById('save-project').addEventListener('click', () => this.saveProject());
        document.getElementById('cancel-project').addEventListener('click', () => this.hideProjectForm());
    }

    hideProjectForm() {
        const form = document.querySelector('.project-form-container');
        if (form) form.remove();
    }

    async saveProject() {
        const projectName = document.getElementById('project-name').value.trim();
        const projectColor = document.getElementById('project-color').value;

        if (!projectName) {
            alert('Please enter a project name');
            return;
        }

        if (this.projects.includes(projectName)) {
            alert('Project already exists');
            return;
        }

        this.projects.push(projectName);
        this.renderProjects();
        
        // Save project color to localStorage
        const projectColors = JSON.parse(localStorage.getItem('projectColors')) || {};
        projectColors[projectName] = projectColor;
        localStorage.setItem('projectColors', JSON.stringify(projectColors));

        this.hideProjectForm();
    }

    deleteProject(projectName) {
        if (projectName === 'Inbox') {
            alert('Cannot delete Inbox');
            return;
        }

        if (confirm(`Are you sure you want to delete project "${projectName}"?`)) {
            // Remove project from projects array
            this.projects = this.projects.filter(p => p !== projectName);
            this.renderProjects();

            // Update tasks associated with this project
            this.tasks = this.tasks.map(task => {
                if (task.project === projectName) {
                    return { ...task, project: 'Inbox' };
                }
                return task;
            });
            this.renderTasks();
        }
    }

    selectProject(projectName) {
        this.currentProject = projectName;
        this.currentView = 'project';
        
        // Update header
        document.querySelector('.header-left h1').textContent = projectName;
        
        // Update active state in sidebar
        document.querySelectorAll('.project-list li').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.project === projectName) {
                item.classList.add('active');
            }
        });

        this.renderTasks();
    }

    renderProjects() {
        const projectList = document.querySelector('.project-list');
        projectList.innerHTML = '';

        const projectColors = JSON.parse(localStorage.getItem('projectColors')) || {};

        this.projects.forEach(projectName => {
            const li = document.createElement('li');
            li.dataset.project = projectName;
            if (projectName === this.currentProject) {
                li.classList.add('active');
            }

            const projectColor = projectColors[projectName] || '#808080';
            
            li.innerHTML = `
                <div class="project-item">
                    <i class="fas fa-circle" style="color: ${projectColor}"></i>
                    <span>${projectName}</span>
                    ${projectName !== 'Inbox' ? `
                        <button class="delete-project">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                </div>`;

            projectList.appendChild(li);
        });
    }

    getFilteredTasks() {
        const today = new Date().toISOString().split('T')[0];
        
        let filteredTasks = this.tasks;

        // First filter by view
        switch(this.currentView) {
            case 'inbox':
                filteredTasks = this.tasks.filter(task => !task.completed);
                break;
            case 'today':
                filteredTasks = this.tasks.filter(task => 
                    task.deadline === today && !task.completed);
                break;
            case 'upcoming':
                filteredTasks = this.tasks.filter(task => 
                    task.deadline > today && !task.completed);
                break;
            case 'project':
                filteredTasks = this.tasks.filter(task => 
                    task.project === this.currentProject && !task.completed);
                break;
        }

        return filteredTasks;
    }

    renderTasks() {
        const taskList = document.querySelector('.task-list');
        taskList.innerHTML = '';

        const filteredTasks = this.getFilteredTasks();

        filteredTasks.forEach(task => {
            const taskElement = document.createElement('div');
            taskElement.className = 'task-item';
            taskElement.dataset.taskId = task._id;

            const priorityClass = `priority-${task.priority}`;
            
            taskElement.innerHTML = `
                <div class="task-checkbox ${task.completed ? 'checked' : ''}"></div>
                <div class="task-content">
                    <div class="task-text ${priorityClass}">${task.title}</div>
                    <div class="task-details">
                        <span class="task-project">${task.project}</span>
                        <span class="task-date">${task.deadline}</span>
                        <span class="task-priority">${task.priority}</span>
                    </div>
                    <div class="task-description">${task.description}</div>
                </div>
                <div class="task-actions">
                    <button class="edit-task"><i class="fas fa-edit"></i></button>
                    <button class="delete-task"><i class="fas fa-trash"></i></button>
                </div>`;

            taskList.appendChild(taskElement);

            // Add event listeners for edit and delete buttons
            taskElement.querySelector('.edit-task').addEventListener('click', () => 
                this.editTask(task._id));
            taskElement.querySelector('.delete-task').addEventListener('click', () => 
                this.deleteTask(task._id));
        });
    }

    async loadUserData() {
        try {
            const response = await fetch('/api/user-data', {
                headers: getAuthHeaders()
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    logout();
                    return;
                }
                throw new Error('Failed to load user data');
            }

            const userData = await response.json();
            // Update UI with user data if needed
            document.querySelector('.user-name').textContent = userData.username;
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }

    showSortOptions() {
        // Create sort menu if it doesn't exist
        let sortMenu = document.querySelector('.sort-menu');
        if (sortMenu) {
            sortMenu.remove();
            return;
        }

        const sortOptions = `
            <div class="sort-menu">
                <div class="sort-option" data-sort="priority">
                    <i class="fas fa-flag"></i> Priority
                </div>
                <div class="sort-option" data-sort="date">
                    <i class="fas fa-calendar"></i> Due Date
                </div>
                <div class="sort-option" data-sort="name">
                    <i class="fas fa-font"></i> Alphabetically
                </div>
                <div class="sort-option" data-sort="project">
                    <i class="fas fa-project-diagram"></i> Project
                </div>
            </div>`;

        const menuContainer = document.createElement('div');
        menuContainer.className = 'sort-menu-container';
        menuContainer.innerHTML = sortOptions;

        const sortButton = document.querySelector('.sort-button');
        sortButton.parentNode.insertBefore(menuContainer, sortButton.nextSibling);

        // Add event listeners to sort options
        document.querySelectorAll('.sort-option').forEach(option => {
            option.addEventListener('click', () => {
                const sortType = option.dataset.sort;
                this.sortTasks(sortType);
                menuContainer.remove();
            });
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.sort-menu') && !e.target.closest('.sort-button')) {
                menuContainer.remove();
            }
        });
    }

    sortTasks(sortType) {
        const sortFunctions = {
            priority: (a, b) => {
                const priorityOrder = { high: 0, medium: 1, low: 2 };
                return priorityOrder[a.priority] - priorityOrder[b.priority];
            },
            date: (a, b) => {
                if (!a.deadline) return 1;
                if (!b.deadline) return -1;
                return new Date(a.deadline) - new Date(b.deadline);
            },
            name: (a, b) => a.title.localeCompare(b.title),
            project: (a, b) => a.project.localeCompare(b.project)
        };

        this.tasks.sort(sortFunctions[sortType]);
        this.renderTasks();
    }
}

// Initialize the Task Manager when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new TaskManager();
});