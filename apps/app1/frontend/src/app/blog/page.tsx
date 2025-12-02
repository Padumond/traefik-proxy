"use client";

import { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

// Sample blog data
const blogPosts = [
  {
    id: 1,
    title: 'Getting Started with Mas3ndi SMS API',
    excerpt: 'Learn how to integrate Mas3ndi SMS API into your applications with this step-by-step guide.',
    date: 'June 1, 2025',
    author: 'Alex Johnson',
    category: 'Tutorials',
    image: '/images/blog-placeholder.jpg'
  },
  {
    id: 2,
    title: 'Best Practices for SMS Marketing Campaigns',
    excerpt: 'Discover effective strategies to maximize engagement and ROI for your SMS marketing campaigns.',
    date: 'May 15, 2025',
    author: 'Sarah Williams',
    category: 'Marketing',
    image: '/images/blog-placeholder.jpg'
  },
  {
    id: 3,
    title: 'How to Optimize Your SMS Delivery Rates',
    excerpt: 'Learn technical tips and best practices to ensure your messages reach recipients reliably.',
    date: 'May 1, 2025',
    author: 'Michael Chen',
    category: 'Technical',
    image: '/images/blog-placeholder.jpg'
  }
];

export default function Blog() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  const categories = ['All', 'Tutorials', 'Marketing', 'Technical', 'Updates'];
  
  const filteredPosts = selectedCategory === 'All' 
    ? blogPosts 
    : blogPosts.filter(post => post.category === selectedCategory);
  
  return (
    <>
      <Navbar />
      <main className="pt-20 pb-16">
        {/* Hero Section */}
        <div className="bg-primary-700 text-white py-16">
          <div className="container-custom">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Mas3ndi Blog</h1>
            <p className="text-xl opacity-90 max-w-2xl">
              Industry insights, technical guides, and SMS best practices to help your business succeed.
            </p>
          </div>
        </div>
        
        {/* Blog Content */}
        <div className="container-custom py-12">
          {/* Category Filter */}
          <div className="mb-10 flex flex-wrap gap-2">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
          
          {/* Blog Posts Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPosts.map(post => (
              <div key={post.id} className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 transition-transform hover:shadow-lg hover:-translate-y-1">
                <div className="h-48 bg-gray-200 relative">
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-center mb-2">
                    <span className="text-xs font-medium text-primary-600 bg-primary-50 px-2 py-1 rounded-full">
                      {post.category}
                    </span>
                    <span className="text-xs text-gray-500 ml-2">
                      {post.date}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold mb-2">{post.title}</h3>
                  <p className="text-gray-600 mb-4">{post.excerpt}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">By {post.author}</span>
                    <Link href={`/blog/${post.id}`} className="text-primary-600 font-medium hover:text-primary-700">
                      Read More →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Newsletter Signup */}
          <div className="mt-16 bg-primary-50 rounded-xl p-8 md:p-12">
            <div className="max-w-3xl mx-auto text-center">
              <h3 className="text-2xl md:text-3xl font-bold mb-4">Subscribe to Our Newsletter</h3>
              <p className="text-gray-600 mb-6">
                Get the latest SMS industry news, tips, and updates delivered to your inbox.
              </p>
              <form className="flex flex-col sm:flex-row gap-2 max-w-lg mx-auto">
                <input
                  type="email"
                  placeholder="Your email address"
                  className="flex-1 px-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button className="px-6 py-3 bg-primary-600 text-white font-medium rounded-md hover:bg-primary-700 transition-colors">
                  Subscribe
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
