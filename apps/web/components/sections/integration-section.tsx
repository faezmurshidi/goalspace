'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Calendar, FileText, Github, Music, Slack, Youtube } from 'lucide-react';

const integrations = [
  {
    icon: Calendar,
    name: 'Google Calendar',
    description: 'Schedule study sessions and track progress',
    color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  {
    icon: Slack,
    name: 'Slack',
    description: 'Collaborate with study groups',
    color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  },
  {
    icon: Github,
    name: 'GitHub',
    description: 'Connect your code projects directly',
    color: 'bg-gray-500/10 text-gray-700 dark:text-gray-300',
  },
  {
    icon: Youtube,
    name: 'YouTube',
    description: 'Embed video tutorials in learning spaces',
    color: 'bg-red-500/10 text-red-600 dark:text-red-400',
  },
  {
    icon: FileText,
    name: 'Notion',
    description: 'Import notes and documentation',
    color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  },
  {
    icon: Music,
    name: 'Spotify',
    description: 'Focus playlists for productive study',
    color: 'bg-green-500/10 text-green-600 dark:text-green-400',
  },
];

export function IntegrationSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };
  
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 100,
      },
    },
  };
  
  return (
    <section className="w-full border-t bg-gray-50/50 py-24 dark:bg-gray-900/50">
      <div className="container mx-auto px-4">
        <div className="text-center">
          <h2 className="mb-4 text-3xl font-bold sm:text-4xl">Seamless Integrations</h2>
          <p className="mx-auto mb-16 max-w-2xl text-lg text-muted-foreground">
            Connect Goalspace with your favorite apps and services to enhance your learning experience.
          </p>
        </div>
        
        <motion.div
          ref={ref}
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="mx-auto grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {integrations.map((integration, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="flex cursor-pointer flex-col items-center rounded-xl border bg-white p-6 shadow-sm transition-all hover:shadow-md dark:bg-gray-800/50"
            >
              <div className={`mb-4 rounded-full p-3 ${integration.color}`}>
                <integration.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 font-medium">{integration.name}</h3>
              <p className="text-center text-sm text-muted-foreground">
                {integration.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
        
        <div className="mt-16 text-center">
          <p className="text-sm text-muted-foreground">
            More integrations coming soon. Suggest an integration you&apos;d like to see.
          </p>
        </div>
      </div>
    </section>
  );
} 