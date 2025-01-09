"use client";

import { Heart, Github, Twitter, Sparkles, Code, Zap, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Background } from "@/components/background";
import { GoalForm } from "@/components/goal-form";
import { GeneratedSpaces } from "@/components/generated-spaces";
import { SiteHeader } from "@/components/site-header";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <>
      
      <div className="relative min-h-screen overflow-hidden">
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background/50 to-background/80 backdrop-blur-[2px]" />
        
        {/* Animated Gradient Orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-20 w-[500px] h-[500px] bg-purple-500/30 rounded-full blur-[100px] animate-pulse" />
          <div className="absolute top-1/3 -right-20 w-[500px] h-[500px] bg-cyan-500/30 rounded-full blur-[100px] animate-pulse delay-1000" />
          <div className="absolute -top-20 left-1/2 w-[500px] h-[500px] bg-rose-500/30 rounded-full blur-[100px] animate-pulse delay-500" />
        </div>

        <div className="relative">
          <SiteHeader />
          
          <div className="container mx-auto px-4 py-16 md:py-24">
            {/* Hero Section */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center mb-16"
            >
              <motion.div 
                whileHover={{ scale: 1.1 }}
                className="inline-block p-3 bg-white/10 rounded-full mb-6 backdrop-blur-md ring-1 ring-white/20 shadow-lg"
              >
                <Heart className="w-8 h-8 text-rose-500 animate-pulse" />
              </motion.div>

              <h1 className="text-4xl md:text-7xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-rose-500 via-purple-500 to-cyan-500 tracking-tight">
                Idea to app in seconds
              </h1>

              <p className="text-xl md:text-2xl text-white/80 max-w-2xl mx-auto mb-12 leading-relaxed">
                Transform your goals into reality with AI-powered mentorship and structured learning paths.
              </p>

              {/* Form Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.8 }}
              >
                <Card className="w-full max-w-[640px] mx-auto bg-white/5 backdrop-blur-xl border-white/10 mb-8 shadow-2xl ring-1 ring-white/20">
                  <div className="p-4">
                    <GoalForm />
                  </div>
                </Card>
              </motion.div>

              <GeneratedSpaces />
            </motion.div>

            {/* Features Grid */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="grid md:grid-cols-3 gap-8 mb-16"
            >
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  whileHover={{ scale: 1.05, rotate: 1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Card className="p-8 bg-white/5 backdrop-blur-xl border-white/10 shadow-2xl ring-1 ring-white/20 h-full">
                    <div className="mb-6 relative">
                      <div className={`absolute inset-0 ${feature.bgColor} blur-2xl opacity-20 rounded-full`} />
                      <feature.icon className={`w-12 h-12 ${feature.color} relative`} />
                    </div>
                    <h3 className="text-2xl font-bold mb-4 text-white">{feature.title}</h3>
                    <p className="text-lg text-white/70 leading-relaxed">{feature.description}</p>
                  </Card>
                </motion.div>
              ))}
            </motion.div>

            {/* Social Proof */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="text-center"
            >
              <h2 className="text-3xl font-bold mb-8 text-white">
                Trusted by developers worldwide
              </h2>
              <div className="flex justify-center gap-6">
                <motion.div whileHover={{ scale: 1.1 }}>
                  <Button variant="ghost" size="lg" className="gap-3 text-white/80 hover:text-white hover:bg-white/10 px-6 backdrop-blur-xl ring-1 ring-white/20">
                    <Star className="w-5 h-5 text-yellow-500" />
                    2.3k Stars
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.1 }}>
                  <Button variant="ghost" size="lg" className="gap-3 text-white/80 hover:text-white hover:bg-white/10 px-6 backdrop-blur-xl ring-1 ring-white/20">
                    <Twitter className="w-5 h-5 text-cyan-500" />
                    Follow Updates
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
}

const features = [
  {
    title: "AI-Powered Mentorship",
    description: "Get personalized guidance and feedback from our advanced AI mentors that understand your goals.",
    icon: Sparkles,
    color: "text-rose-500",
    bgColor: "bg-rose-500"
  },
  {
    title: "Smart Learning Paths",
    description: "Follow structured learning paths tailored to your skill level and learning style.",
    icon: Code,
    color: "text-purple-500",
    bgColor: "bg-purple-500"
  },
  {
    title: "Progress Tracking",
    description: "Track your progress with detailed analytics and milestone achievements.",
    icon: Zap,
    color: "text-cyan-500",
    bgColor: "bg-cyan-500"
  }
];