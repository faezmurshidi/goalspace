-- Insert sample blog posts
INSERT INTO blog_posts (
    title,
    description,
    content,
    author_name,
    category,
    tags
) VALUES (
    'Getting Started with Goal Setting',
    'Learn how to set effective goals and achieve them with our comprehensive guide.',
    'Setting goals is the first step in turning the invisible into the visible. But how do you set goals that you''ll actually achieve? In this guide, we''ll explore the SMART framework for goal setting and provide practical tips for success...',
    'John Doe',
    'Productivity',
    ARRAY['goals', 'productivity', 'success']
),
(
    'The Science of Learning: How to Learn Faster',
    'Discover evidence-based techniques to accelerate your learning process.',
    'Understanding how your brain learns is crucial for optimizing your study habits. In this article, we''ll dive into the latest research on learning techniques and show you how to apply them to your own learning journey...',
    'Jane Smith',
    'Learning',
    ARRAY['learning', 'education', 'study-tips']
),
(
    'Building Better Habits for Long-term Success',
    'A practical guide to forming and maintaining positive habits.',
    'Habits are the compound interest of self-improvement. Here''s how to build habits that stick and transform your life, one small change at a time...',
    'Alex Johnson',
    'Self-Improvement',
    ARRAY['habits', 'self-improvement', 'productivity']
); 