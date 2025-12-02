"use client";

import Image from 'next/image';

const testimonials = [
  {
    content: "Mas3ndi has transformed our SMS marketing efforts. The platform is incredibly easy to use, and the API integration was seamless. We've seen a 40% increase in customer engagement since switching.",
    author: "Sarah Johnson",
    position: "Marketing Director, TechCorp",
    avatar: "/placeholder-avatar.png" // Replace with actual avatar image
  },
  {
    content: "As a reseller, I was looking for a reliable platform with good margins. Mas3ndi exceeded all my expectations. Their support team is responsive and the platform stability is excellent.",
    author: "Michael Chen",
    position: "CEO, SMSGlobal Solutions",
    avatar: "/placeholder-avatar.png" // Replace with actual avatar image
  },
  {
    content: "We needed a solution that could handle our high-volume SMS campaigns during peak seasons. Mas3ndi not only handled the load flawlessly but also provided detailed analytics that helped optimize our strategy.",
    author: "Priya Patel",
    position: "Operations Manager, RetailGiant",
    avatar: "/placeholder-avatar.png" // Replace with actual avatar image
  }
];

export default function Testimonials() {
  return (
    <section id="testimonials" className="section-padding bg-white">
      <div className="container-custom">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">What Our Customers Say</h2>
          <p className="text-gray-600 text-lg">
            Don't just take our word for it. Here's what businesses using Mas3ndi have to say.
          </p>
        </div>

        {/* Testimonial Cards */}
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div 
              key={index} 
              className="bg-primary-700 rounded-xl p-6 shadow-md border border-primary-600"
            >
              {/* Quote Icon */}
              <div className="mb-4 text-primary-400">
                <svg width="45" height="36" className="fill-current" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13.415.43c-2.523 0-4.75.428-6.683 1.284-1.933.855-3.683 1.976-5.25 3.363V13.5h8.318V7.642c0-1.566.56-2.895 1.677-3.988 1.12-1.094 2.522-1.642 4.204-1.642h2.018V.43h-4.284zm19.162 0c-2.523 0-4.75.428-6.683 1.284-1.933.855-3.683 1.976-5.25 3.363V13.5h8.318V7.642c0-1.566.56-2.895 1.677-3.988 1.12-1.094 2.522-1.642 4.204-1.642h2.018V.43h-4.284z" />
                </svg>
              </div>
              
              {/* Testimonial Content */}
              <p className="mb-6 text-white italic">"{testimonial.content}"</p>
              
              {/* Author Info */}
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-full bg-gray-300 mr-4 overflow-hidden">
                  {/* Placeholder for avatar */}
                  <div className="w-full h-full bg-primary-300 flex items-center justify-center text-white font-bold text-lg">
                    {testimonial.author.charAt(0)}
                  </div>
                </div>
                <div>
                  <h4 className="font-bold text-white">{testimonial.author}</h4>
                  <p className="text-sm text-gray-200">{testimonial.position}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Stats Section */}
        <div className="mt-20 bg-primary-800 rounded-xl p-8 md:p-12 shadow-lg border border-primary-700">
          <div className="text-center mb-10">
            <h3 className="text-2xl md:text-3xl font-bold text-white">Trusted by Businesses Worldwide</h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary-400 mb-2">500+</div>
              <p className="text-white">Active Resellers</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary-400 mb-2">50M+</div>
              <p className="text-white">SMS Delivered Monthly</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary-400 mb-2">99.9%</div>
              <p className="text-white">Uptime</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary-400 mb-2">10M+</div>
              <p className="text-white">Messages Sent</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
