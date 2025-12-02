"use client";

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

// Simple test component with the same structure
export default function Documentation() {
  const [activeSection, setActiveSection] = useState('getting-started');
  const [activeTopic, setActiveTopic] = useState('introduction');
  
  return (
    <>
      <Navbar />
      <main className="pt-20 pb-16">
        <div>Test content</div>
      </main>
      <Footer />
    </>
  );
}
