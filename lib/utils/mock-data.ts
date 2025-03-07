/**
 * Mock data for API responses when skipApiCall flag is enabled
 * This file contains realistic mock responses for all API endpoints
 * to use during development without making actual LLM API calls
 */

// Mock responses for goal analysis
export const mockAnalyzeGoalResponse = {
  "questions": [
    {
      "id": "background-knowledge",
      "question": "What is your current level of knowledge or experience with this goal?",
      "purpose": "Understanding your starting point helps tailor the learning path"
    },
    {
      "id": "time-commitment",
      "question": "How much time can you dedicate to this goal weekly?",
      "purpose": "This helps create a realistic timeline and pace"
    },
    {
      "id": "motivation-reason",
      "question": "Why is this goal important to you right now?",
      "purpose": "Identifying your motivation helps maintain momentum"
    },
    {
      "id": "challenges-foreseen",
      "question": "What challenges do you anticipate in achieving this goal?",
      "purpose": "Preparing for obstacles improves success rates"
    }
  ]
};

// Mock responses for chat with mentor
export const mockChatWithMentorResponse = {
  "content": `# Getting Started with JavaScript

I'm glad you're interested in learning JavaScript! It's a versatile language that forms the backbone of modern web development.

## Core Concepts

Here are some fundamental JavaScript concepts to understand:

1. **Variables and Data Types**
   - Primitive types: strings, numbers, booleans
   - Complex types: arrays, objects

2. **Functions**
   - Declaration vs. expression
   - Arrow functions
   - Parameters and return values

3. **Control Flow**
   - Conditionals (if/else)
   - Loops (for, while)
   - Switch statements

## Example Code

Here's a simple example to get you started:

\`\`\`javascript
// Variables
let name = "User";
const age = 25;

// Function
function greet(person) {
  return \`Hello, \${person}! Welcome to JavaScript.\`;
}

// Conditional
if (age >= 18) {
  console.log(greet(name));
  console.log("You're an adult.");
} else {
  console.log(greet(name));
  console.log("You're still young!");
}
\`\`\`

Would you like to learn more about any specific concept?`
};

// Mock responses for generate spaces
export const mockGenerateSpacesResponse = {
  "spaces": [
    {
      "id": "web-development-fundamentals",
      "language": "en",
      "category": "learning",
      "space_color": {
        "main": "#3498db",
        "secondary": "#2980b9",
        "tertiary": "#1abc9c",
        "accent": "#f1c40f"
      },
      "title": "Web Development Fundamentals",
      "title_short": "Web Dev",
      "description": "Master the core technologies of web development including HTML, CSS, and JavaScript to build interactive and responsive websites from scratch.",
      "space_methodology": "Progressive skill building through practical coding exercises and small projects",
      "mentor": {
        "name": "Dr. Emily Chen",
        "expertise": ["Web Development", "Front-end Engineering", "UX Design"],
        "personality": "Patient, detail-oriented, and enthusiastic about teaching practical skills with real-world examples",
        "introduction": "Hi there! I'm Dr. Emily, and I'm excited to guide you through the world of web development. Together, we'll build your skills from the ground up, focusing on practical techniques you can apply right away.",
        "system_prompt": "You are Dr. Emily Chen, a web development expert with 12 years of experience in both teaching and industry projects. You are the expert for this space. You are going to help the user achieve their goal of building their own website. Objective of this space is to provide a solid foundation in HTML, CSS, and JavaScript. You are going to help them achieve this by breaking down complex concepts into manageable steps and providing hands-on projects."
      },
      "objectives": [
        "Understand HTML document structure and semantics",
        "Create responsive layouts with CSS flexbox and grid",
        "Build interactive features with JavaScript",
        "Implement form validation and data handling",
        "Deploy a complete website project"
      ],
      "prerequisites": ["Basic computer skills", "Familiarity with using a text editor"],
      "time_to_complete": "4-6 weeks (at 5-7 hours per week)",
      "to_do_list": [
        "Set up development environment",
        "Create your first HTML page",
        "Style the page with CSS",
        "Add interactivity with JavaScript",
        "Build a responsive navigation menu",
        "Create a contact form with validation",
        "Optimize for different devices",
        "Deploy the website"
      ],
      "extras": ["Recommended code editor: VS Code", "Useful browser extension: Web Developer Tools"]
    },
    {
      "id": "javascript-advanced",
      "language": "en",
      "category": "learning",
      "space_color": {
        "main": "#f39c12",
        "secondary": "#e67e22",
        "tertiary": "#d35400",
        "accent": "#27ae60"
      },
      "title": "Advanced JavaScript Programming",
      "title_short": "JS Advanced",
      "description": "Deepen your JavaScript skills by learning advanced concepts like closures, promises, async/await, and modern ES6+ features to build more robust applications.",
      "space_methodology": "Concept exploration followed by practical application in real-world scenarios",
      "mentor": {
        "name": "Marcus Johnson",
        "expertise": ["JavaScript", "Front-end Frameworks", "Software Architecture"],
        "personality": "Analytical, thought-provoking, and focused on deep understanding rather than surface-level knowledge",
        "introduction": "Hello! I'm Marcus, your guide through the more sophisticated aspects of JavaScript. I believe in understanding the 'why' behind every concept, not just the 'how'. Together, we'll explore JavaScript's powerful features and how they fit into modern development.",
        "system_prompt": "You are Marcus Johnson, a senior JavaScript developer with 15 years of experience building complex applications. You are the expert for this space. You're helping the user achieve their goal of mastering advanced JavaScript. Your approach is to emphasize understanding core concepts deeply rather than memorizing syntax. You focus on practical applications of advanced techniques in real-world scenarios."
      },
      "objectives": [
        "Master closures and the lexical environment",
        "Understand asynchronous programming with promises and async/await",
        "Implement advanced patterns like modules and IIFE",
        "Utilize modern ES6+ features effectively",
        "Apply functional programming concepts in JavaScript"
      ],
      "prerequisites": ["Basic JavaScript knowledge", "Experience with HTML/CSS", "Understanding of basic programming concepts"],
      "time_to_complete": "6-8 weeks (at 5-7 hours per week)",
      "to_do_list": [
        "Review JavaScript fundamentals",
        "Implement a closure-based counter",
        "Refactor callback code to use promises",
        "Build a module system for an application",
        "Create an async data fetching utility",
        "Implement error handling for asynchronous code",
        "Apply functional programming to solve a problem",
        "Build a mini-project using advanced concepts"
      ],
      "extras": ["Recommended reading: 'You Don't Know JS' series", "Tool: ESLint for code quality"]
    }
  ]
};

// Mock responses for generating modules
export const mockGenerateModulesResponse = {
  "modules": [
    {
      "id": "html-fundamentals",
      "title": "HTML Fundamentals",
      "order": 1,
      "description": "Learn the core building blocks of HTML, including document structure, tags, attributes, and semantic markup.",
      "content": `# HTML Fundamentals

HTML (HyperText Markup Language) is the standard markup language for creating web pages. It describes the structure of a web page semantically and originally included cues for the appearance of the document.

## Document Structure

Every HTML document follows a basic structure:

\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document Title</title>
</head>
<body>
  <!-- Content goes here -->
</body>
</html>
\`\`\`

## Essential HTML Elements

### Headings

HTML offers six levels of headings, from \`<h1>\` (most important) to \`<h6>\` (least important):

\`\`\`html
<h1>Main Heading</h1>
<h2>Subheading</h2>
<h3>Section Heading</h3>
\`\`\`

### Paragraphs and Text

Basic text elements:

\`\`\`html
<p>This is a paragraph of text.</p>
<strong>Bold text</strong>
<em>Italic text</em>
<br> <!-- Line break -->
<hr> <!-- Horizontal rule -->
\`\`\`

### Lists

Two main types of lists:

\`\`\`html
<!-- Ordered list -->
<ol>
  <li>First item</li>
  <li>Second item</li>
</ol>

<!-- Unordered list -->
<ul>
  <li>Item</li>
  <li>Another item</li>
</ul>
\`\`\`

### Links

Create hyperlinks with the anchor tag:

\`\`\`html
<a href="https://example.com">Visit Example</a>
<a href="about.html">About Us</a>
<a href="#section">Jump to Section</a>
\`\`\`

### Images

Add images to your page:

\`\`\`html
<img src="image.jpg" alt="Description of image">
\`\`\`

## Semantic HTML

Semantic elements clearly describe their meaning in a human- and machine-readable way:

\`\`\`html
<header>Site header content</header>
<nav>Navigation links</nav>
<main>
  <article>
    <section>Article section</section>
  </article>
  <aside>Sidebar content</aside>
</main>
<footer>Site footer</footer>
\`\`\`

## Practical Exercise

Create a simple "About Me" page that includes:
1. A header with your name
2. A paragraph about yourself
3. A list of your interests or skills
4. A link to your favorite website
5. An image (can be a placeholder)

Use semantic HTML elements where appropriate.`
    },
    {
      "id": "css-basics",
      "title": "CSS Basics",
      "order": 2,
      "description": "Learn how to style HTML elements using CSS, including selectors, properties, and values.",
      "content": `# CSS Basics

CSS (Cascading Style Sheets) is a style sheet language used for describing the presentation of a document written in HTML. CSS describes how elements should be rendered on screen, on paper, in speech, or on other media.

## Adding CSS to HTML

There are three ways to include CSS in your HTML:

### 1. Inline CSS

\`\`\`html
<p style="color: blue; font-size: 18px;">This is a styled paragraph.</p>
\`\`\`

### 2. Internal CSS (in the head section)

\`\`\`html
<head>
  <style>
    p {
      color: blue;
      font-size: 18px;
    }
  </style>
</head>
\`\`\`

### 3. External CSS (recommended)

\`\`\`html
<head>
  <link rel="stylesheet" href="styles.css">
</head>
\`\`\`

Then in styles.css:
\`\`\`css
p {
  color: blue;
  font-size: 18px;
}
\`\`\`

## CSS Selectors

Selectors determine which elements the styles will apply to:

\`\`\`css
/* Element selector */
p {
  color: blue;
}

/* Class selector */
.highlight {
  background-color: yellow;
}

/* ID selector */
#header {
  font-size: 24px;
}

/* Descendant selector */
article p {
  line-height: 1.5;
}

/* Pseudo-class */
a:hover {
  text-decoration: underline;
}
\`\`\`

## Common CSS Properties

### Text Styling

\`\`\`css
p {
  color: #333;
  font-family: Arial, sans-serif;
  font-size: 16px;
  font-weight: bold;
  text-align: center;
  line-height: 1.5;
  letter-spacing: 1px;
  text-decoration: underline;
  text-transform: uppercase;
}
\`\`\`

### Box Model

\`\`\`css
div {
  width: 300px;
  height: 200px;
  padding: 20px;
  border: 1px solid black;
  margin: 10px;
}
\`\`\`

### Background

\`\`\`css
body {
  background-color: #f0f0f0;
  background-image: url('background.jpg');
  background-repeat: no-repeat;
  background-position: center;
  background-size: cover;
}
\`\`\`

### Display and Positioning

\`\`\`css
div {
  display: block; /* inline, flex, grid, none, etc. */
  position: relative; /* static, absolute, fixed, sticky */
  top: 10px;
  left: 20px;
  z-index: 1;
}
\`\`\`

## CSS Units

Various units for specifying sizes:

\`\`\`css
p {
  font-size: 16px; /* pixels */
  margin: 1em; /* relative to font-size */
  width: 50%; /* percentage of parent */
  height: 100vh; /* viewport height */
  padding: 0.5rem; /* relative to root font-size */
}
\`\`\`

## Practical Exercise

Style the "About Me" page you created in the HTML module:

1. Change the colors of text elements
2. Add background colors or images
3. Style your list with custom bullets or numbers
4. Add hover effects to your links
5. Create a layout with margins and padding
6. Make your image responsive

Try to use a variety of selectors and properties in your stylesheet.`
    }
  ]
};

// Mock responses for generating module content
export const mockGenerateModuleContentResponse = {
  "content": `# JavaScript Fundamentals

JavaScript is a high-level, interpreted programming language that is one of the core technologies of the World Wide Web. It enables interactive web pages and is an essential part of web applications.

## Variables and Data Types

JavaScript has several ways to declare variables:

\`\`\`javascript
// Using var (older method, function-scoped)
var name = "John";

// Using let (block-scoped, can be reassigned)
let age = 25;

// Using const (block-scoped, cannot be reassigned)
const PI = 3.14159;
\`\`\`

Common data types include:

\`\`\`javascript
// String
let greeting = "Hello World";

// Number
let count = 42;
let price = 19.99;

// Boolean
let isActive = true;

// Array
let colors = ["red", "green", "blue"];

// Object
let person = {
  name: "Sarah",
  age: 30,
  isEmployed: true
};

// Null and Undefined
let empty = null;
let notDefined;  // undefined
\`\`\`

## Operators

JavaScript includes various operators for performing operations:

\`\`\`javascript
// Arithmetic operators
let sum = 5 + 10;
let difference = 20 - 5;
let product = 4 * 3;
let quotient = 15 / 3;
let remainder = 10 % 3;

// Comparison operators
let isEqual = 5 === 5;
let isNotEqual = 10 !== 5;
let isGreater = 10 > 5;
let isLess = 5 < 10;

// Logical operators
let andResult = true && false;  // false
let orResult = true || false;   // true
let notResult = !true;          // false
\`\`\`

## Control Flow

### Conditionals

\`\`\`javascript
// If statement
if (age >= 18) {
  console.log("You are an adult");
} else if (age >= 13) {
  console.log("You are a teenager");
} else {
  console.log("You are a child");
}

// Switch statement
switch (day) {
  case "Monday":
    console.log("Start of work week");
    break;
  case "Friday":
    console.log("End of work week");
    break;
  default:
    console.log("Another day");
    break;
}
\`\`\`

### Loops

\`\`\`javascript
// For loop
for (let i = 0; i < 5; i++) {
  console.log(i);  // Outputs 0, 1, 2, 3, 4
}

// While loop
let count = 0;
while (count < 5) {
  console.log(count);
  count++;
}

// For...of loop (for arrays)
const fruits = ["apple", "banana", "cherry"];
for (const fruit of fruits) {
  console.log(fruit);
}

// For...in loop (for objects)
const person = { name: "Alice", age: 25, job: "Developer" };
for (const key in person) {
  console.log(key + ": " + person[key]);
}
\`\`\`

## Functions

Functions are reusable blocks of code:

\`\`\`javascript
// Function declaration
function greet(name) {
  return "Hello, " + name + "!";
}

// Function expression
const add = function(a, b) {
  return a + b;
};

// Arrow function
const multiply = (a, b) => a * b;

// Default parameters
function welcome(name = "Guest") {
  return "Welcome, " + name;
}

// Calling functions
console.log(greet("Sarah"));  // "Hello, Sarah!"
console.log(add(5, 3));       // 8
console.log(multiply(4, 2));  // 8
console.log(welcome());       // "Welcome, Guest"
\`\`\`

## DOM Manipulation

JavaScript can interact with HTML elements through the Document Object Model (DOM):

\`\`\`javascript
// Selecting elements
const heading = document.getElementById("main-heading");
const paragraphs = document.getElementsByTagName("p");
const buttons = document.getElementsByClassName("btn");
const firstButton = document.querySelector(".btn");
const allLinks = document.querySelectorAll("a");

// Changing content
heading.textContent = "New Heading";
heading.innerHTML = "New <span>Heading</span>";

// Changing styles
heading.style.color = "blue";
heading.style.fontSize = "24px";

// Adding/removing classes
heading.classList.add("highlight");
heading.classList.remove("old-class");
heading.classList.toggle("visible");

// Creating and adding elements
const newParagraph = document.createElement("p");
newParagraph.textContent = "This is a new paragraph.";
document.body.appendChild(newParagraph);

// Event handling
const button = document.querySelector("button");
button.addEventListener("click", function() {
  alert("Button was clicked!");
});
\`\`\`

## Practical Exercise

Create a simple interactive to-do list:

1. Create an HTML file with:
   - An input field for new tasks
   - A button to add tasks
   - An unordered list to display tasks

2. Write JavaScript to:
   - Add new tasks when the button is clicked
   - Allow tasks to be marked as completed (by clicking on them)
   - Allow tasks to be deleted

This exercise will practice DOM manipulation, event handling, and basic JavaScript logic.`
};

// Mock responses for generating plan
export const mockGeneratePlanResponse = {
  "plan": [
    {
      "week": 1,
      "title": "Getting Started with HTML & CSS",
      "description": "Introduction to the fundamentals of web page structure and styling.",
      "activities": [
        "Set up development environment with VS Code",
        "Learn HTML document structure and basic tags",
        "Understand CSS selectors and common properties",
        "Create a simple personal profile page"
      ],
      "goals": "By the end of this week, you should be able to create a basic web page with styled content."
    },
    {
      "week": 2,
      "title": "JavaScript Fundamentals",
      "description": "Introduction to programming concepts with JavaScript.",
      "activities": [
        "Learn variables, data types, and operators",
        "Understand control flow (if/else, loops)",
        "Write basic functions for common tasks",
        "Add interactive elements to your web page"
      ],
      "goals": "By the end of this week, you should understand basic programming concepts and be able to add simple interactivity to web pages."
    },
    {
      "week": 3,
      "title": "DOM Manipulation & Events",
      "description": "Working with HTML elements through JavaScript.",
      "activities": [
        "Learn to select and modify HTML elements",
        "Understand event listeners and handlers",
        "Build a simple to-do list application",
        "Implement form validation"
      ],
      "goals": "By the end of this week, you should be able to create dynamic web pages that respond to user interactions."
    },
    {
      "week": 4,
      "title": "Responsive Web Design",
      "description": "Creating websites that work well on all devices.",
      "activities": [
        "Learn about media queries and viewport units",
        "Implement CSS flexbox and grid layouts",
        "Create a mobile-first responsive layout",
        "Test and debug across different screen sizes"
      ],
      "goals": "By the end of this week, you should be able to build websites that adapt to different device sizes."
    }
  ]
};

// Mock responses for generating mindmap
export const mockGenerateMindmapResponse = {
  "mindmap": [
    {
      "id": "web-development",
      "name": "Web Development",
      "children": [
        {
          "id": "frontend",
          "name": "Frontend",
          "children": [
            {
              "id": "html",
              "name": "HTML",
              "children": [
                {
                  "id": "tags",
                  "name": "Tags & Elements"
                },
                {
                  "id": "attributes",
                  "name": "Attributes"
                },
                {
                  "id": "semantics",
                  "name": "Semantic HTML"
                }
              ]
            },
            {
              "id": "css",
              "name": "CSS",
              "children": [
                {
                  "id": "selectors",
                  "name": "Selectors"
                },
                {
                  "id": "box-model",
                  "name": "Box Model"
                },
                {
                  "id": "layout",
                  "name": "Layout Systems"
                },
                {
                  "id": "responsive",
                  "name": "Responsive Design"
                }
              ]
            },
            {
              "id": "javascript",
              "name": "JavaScript",
              "children": [
                {
                  "id": "syntax",
                  "name": "Syntax & Basics"
                },
                {
                  "id": "dom",
                  "name": "DOM Manipulation"
                },
                {
                  "id": "events",
                  "name": "Event Handling"
                },
                {
                  "id": "async",
                  "name": "Asynchronous JS"
                }
              ]
            }
          ]
        },
        {
          "id": "backend",
          "name": "Backend",
          "children": [
            {
              "id": "servers",
              "name": "Servers"
            },
            {
              "id": "databases",
              "name": "Databases"
            },
            {
              "id": "apis",
              "name": "APIs"
            }
          ]
        },
        {
          "id": "tools",
          "name": "Development Tools",
          "children": [
            {
              "id": "code-editors",
              "name": "Code Editors"
            },
            {
              "id": "version-control",
              "name": "Version Control"
            },
            {
              "id": "testing",
              "name": "Testing Tools"
            }
          ]
        }
      ]
    }
  ]
};

// Mock responses for generating podcast
export const mockGeneratePodcastResponse = {
  "podcast": {
    "title": "Mastering the Web Development Journey",
    "host": "Dr. Emily Chen",
    "duration": "22:35",
    "description": "A comprehensive overview of the web development learning path, from HTML basics to advanced JavaScript concepts.",
    "transcript": `
Host: Welcome to the GoalSpace Learning Podcast. I'm Dr. Emily Chen, and today we're diving into the journey of becoming a web developer. Whether you're starting from scratch or looking to enhance your skills, this roadmap will guide you through the essential steps.

[INTRO MUSIC]

Host: Web development is both an art and a science. It combines visual design with technical programming to create the websites and applications we use every day. Let's break down this journey into manageable stages.

First, let's talk about the foundations: HTML and CSS. HTML, or HyperText Markup Language, is the skeleton of any website. It provides the structure and content. Think of it as the framing of a house - without it, nothing else stands.

When learning HTML, focus on understanding semantic elements. These are tags that give meaning to the content they contain, like <header>, <nav>, <article>, and <footer>. Semantic HTML not only makes your code more readable but also improves accessibility and SEO.

CSS, or Cascading Style Sheets, is what brings your HTML to life visually. It handles all the styling - colors, layouts, fonts, and more. A solid understanding of CSS selectors, the box model, and layout systems like Flexbox and Grid is essential.

One common misconception is that you need to memorize every HTML tag or CSS property. That's simply not true! The best web developers know the fundamentals and know how to find what they need when they need it.

[TRANSITION SOUND]

Host: Once you've got a handle on HTML and CSS, it's time to add interactivity with JavaScript. JavaScript is what makes modern websites dynamic and responsive to user actions.

Start with the basics: variables, data types, functions, and control flow. Then move on to DOM manipulation - this is how JavaScript interacts with HTML and CSS. Understanding events and event listeners is crucial for creating interactive experiences.

A lot of beginners get stuck at this stage because JavaScript introduces programming concepts that might be new if you haven't coded before. My advice is to practice with small projects - build a calculator, a to-do list, or a simple game. These projects reinforce the concepts and give you confidence.

[TRANSITION SOUND]

Host: As you grow more comfortable with these technologies, you'll want to learn about responsive design - making sure your websites look good on all devices. Media queries in CSS are your friend here.

You'll also want to explore frameworks and libraries that make development faster and more efficient. React, Vue, and Angular are popular choices for front-end development. On the back-end side, you might look into Node.js, Express, Django, or Ruby on Rails.

Version control with Git is absolutely essential in today's development environment. It allows you to track changes, collaborate with others, and maintain different versions of your codebase.

[TRANSITION SOUND]

Host: Now, let's address some common challenges and misconceptions:

First, the idea that you need to learn everything before building anything. This is absolutely false! The web development field is too vast to know everything. Start building real projects as soon as possible, and learn what you need along the way.

Second, the fear of making mistakes. Debugging is a natural part of coding. Every error is an opportunity to learn something new about how the system works.

Third, the misconception that web development is purely technical. In reality, it requires creativity, problem-solving skills, and empathy for the user experience.

[TRANSITION SOUND]

Host: Before we wrap up, here's a practical learning path you can follow:

1. Start with HTML and CSS basics - build some static pages
2. Learn JavaScript fundamentals and DOM manipulation
3. Build small interactive projects that combine all three
4. Learn responsive design principles
5. Pick up a popular framework like React
6. Explore back-end development if interested
7. Practice with real-world projects that solve actual problems

Remember, consistency is key. It's better to spend 30 minutes coding every day than 8 hours once a week.

[CLOSING MUSIC]

Host: That's our overview of the web development journey. In the next episode, we'll dive deeper into advanced CSS techniques for creating stunning visual effects. Until then, happy coding!
`
  }
};

// Map of API endpoint paths to their corresponding mock data
export const mockResponseMap = {
  '/api/generate': (params: any) => {
    // Based on the useCase parameter, return appropriate mock data
    switch (params.useCase) {
      case 'plan':
        return { content: JSON.stringify(mockGeneratePlanResponse.plan) };
      case 'research':
        return { content: mockGenerateModuleContentResponse.content };
      case 'mindmap':
        return { content: JSON.stringify(mockGenerateMindmapResponse.mindmap) };
      case 'podcast':
        return { content: JSON.stringify(mockGeneratePodcastResponse.podcast) };
      default:
        return { content: "This is a mock response for " + params.useCase };
    }
  },
  '/api/analyze-goal/route': () => mockAnalyzeGoalResponse,
  '/api/chat-with-mentor/route': () => mockChatWithMentorResponse,
  '/api/generate-spaces/route': () => mockGenerateSpacesResponse,
  '/api/generate-modules/route': () => mockGenerateModulesResponse,
  '/api/generate-module-content/route': () => mockGenerateModuleContentResponse,
  '/api/generate-plan/route': () => mockGeneratePlanResponse,
  '/api/generate-mindmap/route': () => mockGenerateMindmapResponse,
  '/api/make-podcast/route': () => mockGeneratePodcastResponse,
};