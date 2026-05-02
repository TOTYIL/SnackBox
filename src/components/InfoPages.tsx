import React from 'react';
import { motion } from 'motion/react';
import { Mail, Phone, ArrowLeft } from 'lucide-react';

interface InfoPageProps {
  onClose: () => void;
}

const PageContainer: React.FC<{onClose: () => void, title: string, children: React.ReactNode}> = ({ onClose, title, children }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xl"
    >
      <div className="max-w-4xl mx-auto p-4 sm:p-6 md:p-12 min-h-screen flex flex-col pt-20 sm:pt-24 pb-12">
        <div className="flex items-center gap-4 mb-6 pb-4 border-b border-white/10 text-white">
          <button onClick={onClose} className="p-2 glass-button rounded-full shrink-0">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-indigo-400 leading-tight">
            {title}
          </h1>
        </div>
        <div className="glass-panel border-white/20 p-5 sm:p-8 rounded-3xl flex-1 text-white/80 leading-relaxed font-light text-sm sm:text-base space-y-4 shadow-xl">
          {children}
        </div>
      </div>
    </motion.div>
  );
};

export const CustomerCare: React.FC<InfoPageProps> = ({ onClose }) => {
  return (
    <PageContainer onClose={onClose} title="Customer Care">
      <div className="flex flex-col items-center justify-center h-full gap-8 py-12">
        <p className="text-xl text-center max-w-md">
          Need help with your cravings? Our delivery buddies are here for you!
        </p>
        
        <div className="flex flex-col sm:flex-row gap-6 w-full max-w-lg">
          <a href="mailto:snackbox.llc.in@gmail.com" className="flex-1 glass-panel hover:bg-white/10 transition-colors p-6 rounded-3xl flex flex-col items-center gap-4 border border-white/20 text-white text-center">
            <div className="w-16 h-16 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center">
              <Mail size={32} />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Text with us</h3>
              <p className="text-white/60 text-sm mt-1">snackbox.llc.in@gmail.com</p>
            </div>
          </a>
          
          <a href="tel:7830097353" className="flex-1 glass-panel hover:bg-white/10 transition-colors p-6 rounded-3xl flex flex-col items-center gap-4 border border-white/20 text-white text-center">
            <div className="w-16 h-16 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Phone size={32} />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Call us</h3>
              <p className="text-white/60 text-sm mt-1">7830097353</p>
            </div>
          </a>
        </div>
      </div>
    </PageContainer>
  );
};

export const TermsOfService: React.FC<InfoPageProps> = ({ onClose }) => {
  return (
    <PageContainer onClose={onClose} title="Terms & Conditions for SnackBox">
      <p className="font-medium text-white mb-4">Welcome to SnackBox. These Terms and Conditions ("Terms") govern your use of the SnackBox delivery service. By placing an order, you agree to be bound by these rules. Please read them carefully to ensure a smooth snacking experience.</p>
      
      <h3 className="text-lg font-semibold text-pink-300 mt-6 mb-2">1. Acceptance of Terms</h3>
      <p>By accessing our service or placing an order, you confirm that you are a currently enrolled student or authorized resident of the hostel premises. SnackBox reserves the right to update these terms at any time without prior notice.</p>
      
      <h3 className="text-lg font-semibold text-pink-300 mt-6 mb-2">2. Ordering and Pricing</h3>
      <ul className="list-disc pl-5 space-y-2 text-white/70">
        <li><strong className="text-white/90">Accuracy:</strong> Users are responsible for providing the correct Room Number, Hostel Block, and Contact Number. SnackBox is not liable for failed deliveries due to incorrect information.</li>
        <li><strong className="text-white/90">Pricing:</strong> All prices are listed in Indian Rupees (INR). Prices are subject to change based on stock availability and vendor updates.</li>
        <li><strong className="text-white/90">Minimum Order:</strong> We reserve the right to enforce a minimum order value for door-to-room delivery services.</li>
      </ul>
      
      <h3 className="text-lg font-semibold text-pink-300 mt-6 mb-2">3. Delivery Protocol</h3>
      <ul className="list-disc pl-5 space-y-2 text-white/70">
        <li><strong className="text-white/90">Delivery Window:</strong> We aim to deliver within the estimated timeframe provided at checkout. However, delays due to hostel entry restrictions, weather, or high demand may occur.</li>
        <li><strong className="text-white/90">Recipient Presence:</strong> If you are not in your room at the time of delivery, our delivery partner will attempt to contact you twice. If unreachable, the order will be marked as "Failed Delivery" and may not be eligible for a refund.</li>
        <li><strong className="text-white/90">Hostel Rules:</strong> SnackBox operates in compliance with internal hostel regulations. We reserve the right to suspend service during curfew hours or official hostel lockdowns.</li>
      </ul>
      
      <h3 className="text-lg font-semibold text-pink-300 mt-6 mb-2">4. Payments and Refunds</h3>
      <ul className="list-disc pl-5 space-y-2 text-white/70">
        <li><strong className="text-white/90">Payment Methods:</strong> We accept UPI, digital wallets, and Cash on Delivery (COD) where specified.</li>
        <li><strong className="text-white/90">Cancellations:</strong> Orders can only be cancelled within 2 minutes of placement. Once the kitchen/store has started processing your order, cancellations are strictly prohibited.</li>
      </ul>
      <p className="mt-2 text-white/70">Refunds are only processed if:</p>
      <ul className="list-disc pl-5 space-y-1 text-white/70">
        <li>The item is out of stock.</li>
        <li>The item delivered is incorrect or expired.</li>
        <li>The delivery fails due to a SnackBox internal error.</li>
      </ul>

      <h3 className="text-lg font-semibold text-pink-300 mt-6 mb-2">5. Health and Safety (Allergies)</h3>
      <ul className="list-disc pl-5 space-y-2 text-white/70">
        <li><strong className="text-white/90">User Responsibility:</strong> SnackBox acts as a delivery intermediary. It is the user's responsibility to check the packaging of products for allergen information (e.g., peanuts, gluten, dairy).</li>
        <li><strong className="text-white/90">Liability:</strong> SnackBox is not liable for any allergic reactions or health issues arising from the consumption of third-party manufactured snacks.</li>
      </ul>
      
      <h3 className="text-lg font-semibold text-pink-300 mt-6 mb-2">6. Prohibited Activities</h3>
      <p>Users agree not to:</p>
      <ul className="list-disc pl-5 space-y-1 text-white/70">
        <li>Use the service for any illegal purposes or to transport prohibited substances.</li>
        <li>Harass, threaten, or abuse delivery personnel.</li>
        <li>Provide fraudulent payment information.</li>
      </ul>
      
      <h3 className="text-lg font-semibold text-pink-300 mt-6 mb-2">7. Limitation of Liability</h3>
      <p>To the maximum extent permitted by law, SnackBox shall not be liable for any indirect, incidental, or consequential damages resulting from the use of our service. Our liability for any claim shall not exceed the total amount paid for the specific order in question.</p>
      
      <h3 className="text-lg font-semibold text-pink-300 mt-6 mb-2">8. Governing Law</h3>
      <p>These Terms shall be governed by and construed in accordance with the laws of India and the internal regulations of the Institutional Campus where the service is provided.</p>
      
      <p className="italic text-white/50 mt-8">Note: Continued use of SnackBox implies that you have read, understood, and agreed to these Terms and Conditions. Stay hungry, stay snacking!</p>
    </PageContainer>
  );
};

export const PrivacyPolicy: React.FC<InfoPageProps> = ({ onClose }) => {
  return (
    <PageContainer onClose={onClose} title="Privacy Policy for SnackBox">
      <p className="font-medium text-white mb-4">This Privacy Policy explains how SnackBox ("we," "our," or "us") collects, uses, and protects your information when you use our delivery service. We are committed to ensuring that your personal data is handled securely and transparently.</p>
      
      <h3 className="text-lg font-semibold text-indigo-300 mt-6 mb-2">1. Information We Collect</h3>
      <p className="text-white/70 mb-2">To provide a seamless delivery experience within the hostel, we collect the following information:</p>
      <ul className="list-disc pl-5 space-y-2 text-white/70">
        <li><strong className="text-white/90">Personal Identifiers:</strong> Name, phone number, and email address.</li>
        <li><strong className="text-white/90">Delivery Details:</strong> Hostel block, room number, and campus location.</li>
        <li><strong className="text-white/90">Order History:</strong> Details of the snacks you purchase and your frequency of use.</li>
        <li><strong className="text-white/90">Technical Data:</strong> IP address, browser type, and device information (collected automatically via our web platform).</li>
      </ul>

      <h3 className="text-lg font-semibold text-indigo-300 mt-6 mb-2">2. How We Use Your Information</h3>
      <p className="text-white/70 mb-2">Your data is used strictly for operational purposes, including:</p>
      <ul className="list-disc pl-5 space-y-2 text-white/70">
        <li><strong className="text-white/90">Order Fulfillment:</strong> Processing your orders and ensuring the delivery reaches the correct room.</li>
        <li><strong className="text-white/90">Communication:</strong> Sending order confirmations, delivery status updates, or notifying you of stock changes.</li>
        <li><strong className="text-white/90">Service Improvement:</strong> Analyzing ordering trends to improve our inventory and user interface.</li>
        <li><strong className="text-white/90">Security:</strong> Preventing fraudulent transactions and maintaining the integrity of our database.</li>
      </ul>

      <h3 className="text-lg font-semibold text-indigo-300 mt-6 mb-2">3. Data Storage and Security</h3>
      <p className="text-white/70 mb-2">We prioritize the safety of your information:</p>
      <ul className="list-disc pl-5 space-y-2 text-white/70">
        <li><strong className="text-white/90">Storage:</strong> Your data is stored using secure, encrypted cloud-based databases.</li>
        <li><strong className="text-white/90">Protection:</strong> We implement industry-standard security protocols to prevent unauthorized access, alteration, or disclosure of your personal details.</li>
        <li><strong className="text-white/90">Retention:</strong> We only keep your personal information for as long as is necessary to provide you with our services or as required by law.</li>
      </ul>

      <h3 className="text-lg font-semibold text-indigo-300 mt-6 mb-2">4. Third-Party Sharing</h3>
      <p className="text-white/70 mb-2">We do not sell, trade, or rent your personal information to third parties. We only share data with trusted partners essential to our operations:</p>
      <ul className="list-disc pl-5 space-y-2 text-white/70">
        <li><strong className="text-white/90">Payment Gateways:</strong> To process UPI or digital wallet transactions securely.</li>
        <li><strong className="text-white/90">Infrastructure Providers:</strong> Services that host our database and application.</li>
        <li><strong className="text-white/90">Legal Necessity:</strong> If required by law or campus authorities to comply with safety and legal regulations.</li>
      </ul>

      <h3 className="text-lg font-semibold text-indigo-300 mt-6 mb-2">5. Your Rights</h3>
      <p className="text-white/70 mb-2">As a user, you have the right to:</p>
      <ul className="list-disc pl-5 space-y-2 text-white/70">
        <li><strong className="text-white/90">Access:</strong> Request a copy of the data we hold about you.</li>
        <li><strong className="text-white/90">Correction:</strong> Ask us to update or fix any incorrect information (e.g., a changed room number).</li>
        <li><strong className="text-white/90">Deletion:</strong> Request that we delete your account and associated personal data, subject to any legal or transactional obligations.</li>
      </ul>

      <h3 className="text-lg font-semibold text-indigo-300 mt-6 mb-2">6. Cookies and Tracking</h3>
      <p className="text-white/70">Our web application may use cookies to enhance your login experience and remember your preferences. You can choose to disable cookies through your browser settings, though some features of SnackBox may not function correctly as a result.</p>

      <h3 className="text-lg font-semibold text-indigo-300 mt-6 mb-2">7. Changes to This Policy</h3>
      <p className="text-white/70">We may update this Privacy Policy periodically to reflect changes in our practices or for legal reasons. The "Effective Date" at the top of the page will indicate when the latest changes were made.</p>

      <h3 className="text-lg font-semibold text-indigo-300 mt-6 mb-2">Contact Us</h3>
      <p className="text-white/70">If you have any questions regarding your privacy or how your data is handled, please reach out to the SnackBox Support Team via our official contact channels.</p>
      
      <p className="italic text-white/50 mt-8">By using SnackBox, you consent to the collection and use of your information as outlined in this Privacy Policy.</p>
    </PageContainer>
  );
};
