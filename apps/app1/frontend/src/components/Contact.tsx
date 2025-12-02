"use client";

import Link from "next/link";

export default function Contact() {
  return (
    <section
      id="contact"
      className="section-padding bg-gray-200/80 dark:bg-gray-800/50"
    >
      <div className="container-custom">
        <div className="bg-gradient-to-r from-primary-700/90 to-secondary-800/90 rounded-2xl overflow-hidden shadow-xl shadow-gray-400/50 dark:shadow-gray-900/50 transform hover:scale-[1.01] transition-all duration-300">
          <div className="flex flex-col md:flex-row">
            {/* Contact Form Side */}
            <div className="w-full md:w-1/2 p-8 md:p-12 bg-white">
              <h3 className="text-2xl md:text-3xl font-bold mb-6">
                Get in Touch
              </h3>
              <p className="text-gray-600 mb-8">
                Have questions about our platform? Fill out the form and we'll
                get back to you as soon as possible.
              </p>

              <form>
                <div className="mb-4">
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Your Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="John Doe"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="john@example.com"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label
                    htmlFor="subject"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Subject
                  </label>
                  <input
                    type="text"
                    id="subject"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="How can we help you?"
                    required
                  />
                </div>

                <div className="mb-6">
                  <label
                    htmlFor="message"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Message
                  </label>
                  <textarea
                    id="message"
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Your message here..."
                    required
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 px-4 rounded-md transition-all duration-300 shadow-md hover:shadow-lg"
                >
                  Send Message
                </button>
              </form>
            </div>

            {/* CTA Side */}
            <div className="w-full md:w-1/2 p-8 md:p-12 text-white">
              <h3 className="text-2xl md:text-3xl font-bold mb-6">
                Ready to Get Started?
              </h3>
              <p className="text-green-100 font-semibold mb-8">
                Join thousands of businesses that use Mas3ndi for their SMS
                marketing and communication needs. Create an account today and
                start sending messages in minutes.
              </p>

              <div className="mb-12">
                <Link
                  href="/register"
                  className="bg-white text-primary-600 hover:bg-gray-100 font-bold py-3 px-8 rounded-md shadow-lg transition-all duration-300 inline-block"
                >
                  Create Free Account
                </Link>
              </div>

              <div className="border-t border-primary-500 pt-8">
                <h4 className="font-bold text-xl mb-4">Contact Information</h4>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <svg
                      className="w-6 h-6 mr-3 text-primary-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                    <div>
                      <p className="font-medium">Phone</p>
                      <p className="text-green-100">+233 558-838-557</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <svg
                      className="w-6 h-6 mr-3 text-primary-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    <div>
                      <p className="font-medium">Email</p>
                      <p className="text-green-100">
                        info@work-itsolutions.com
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
