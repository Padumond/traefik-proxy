"use client";

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

// Define the documentation structure
const docSections = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    topics: [
      { id: 'introduction', title: 'Introduction to Mas3ndi' },
      { id: 'account-setup', title: 'Account Setup' },
    ],
  },
];

export default function Documentation() {
  const [activeSection, setActiveSection] = useState('getting-started');
  const [activeTopic, setActiveTopic] = useState('introduction');
  
  // Helper function to determine if a section is active
  const isSectionActive = (sectionId: string) => {
    return activeSection === sectionId;
  };
  
  // Helper function to determine if a topic is active
  const isTopicActive = (topicId: string) => {
    return activeTopic === topicId;
  };
  
  return (
    <>
      <Navbar />
      <main className="pt-20 pb-16">
        <div className="bg-primary-700 text-white py-16">
          <div className="container-custom">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Documentation</h1>
            <p className="text-xl opacity-90 max-w-2xl">
              Comprehensive guides to help you get the most out of Mas3ndi's SMS platform.
            </p>
          </div>
        </div>
        
        <div className="container-custom py-12">
          <p>Minimal content for testing</p>
        </div>
      </main>
      <Footer />
    </>
  );
}
