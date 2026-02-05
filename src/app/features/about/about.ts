import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiConfig } from '../../core/config/api.config';

interface Feature {
  number: number;
  title: string;
  description: string;
  icon: string;
  highlight?: string;
}

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './about.html',
  styleUrl: './about.scss'
})
export class About {
  currentYear = new Date().getFullYear();
  staticUrl = ApiConfig.STATIC_URL;

  features: Feature[] = [
    {
      number: 1,
      title: 'QR Code Check-In & Check-Out',
      description: 'The moment a child arrives, parents can scan a QR code for instant check-in. MiniMinds automatically logs the time, location, and updates attendance records in real-time. No more paper sign-in sheets or manual entry.',
      icon: 'bi-qr-code-scan',
      highlight: 'Save 30+ minutes daily'
    },
    {
      number: 2,
      title: 'Automatic Daily Activity Reports',
      description: 'Teachers can log activities, meals, naps, and milestones throughout the day with just a few taps. At the end of the day, parents automatically receive a comprehensive summary of their child\'s activities.',
      icon: 'bi-journal-text',
      highlight: 'One-tap logging'
    },
    {
      number: 3,
      title: 'Real-Time Push Notifications',
      description: 'Keep parents informed instantly with real-time push notifications. Whether it\'s an activity update, photo share, or important announcement, parents receive alerts the moment something happens.',
      icon: 'bi-bell',
      highlight: 'Instant updates'
    },
    {
      number: 4,
      title: 'Photo & Video Sharing',
      description: 'Capture precious moments throughout the day and share them directly with parents. Photos are automatically organized in each child\'s gallery, creating a beautiful timeline of memories.',
      icon: 'bi-camera',
      highlight: 'Unlimited sharing'
    },
    {
      number: 5,
      title: 'Automated Menu Management',
      description: 'Upload your weekly or monthly menus once, and MiniMinds automatically populates meal information into daily reports. Parents can even make food selections for their children in advance.',
      icon: 'bi-egg-fried',
      highlight: 'Set it & forget it'
    },
    {
      number: 6,
      title: 'Direct Parent-Teacher Messaging',
      description: 'Secure, in-app messaging keeps communication streamlined and professional. Read receipts ensure messages are seen, and conversation history is always accessible.',
      icon: 'bi-chat-heart',
      highlight: 'No more lost emails'
    },
    {
      number: 7,
      title: 'Online Payment Processing',
      description: 'Accept tuition and fee payments directly through the app with secure Stripe integration. Automatic payment reminders and receipts reduce administrative workload.',
      icon: 'bi-credit-card',
      highlight: 'Get paid faster'
    },
    {
      number: 8,
      title: 'Smart Attendance Tracking',
      description: 'Track attendance patterns, generate reports, and maintain accurate child-to-staff ratios automatically. Geolocation verification ensures check-ins happen at the right location.',
      icon: 'bi-clipboard-check',
      highlight: 'Always compliant'
    },
    {
      number: 9,
      title: 'Event Management & Calendar',
      description: 'Create and manage events, track participant registrations, and send automatic reminders. Parents can RSVP directly through the app, and everyone stays on the same page.',
      icon: 'bi-calendar-event',
      highlight: 'Simplified planning'
    },
    {
      number: 10,
      title: 'Multi-Tenant Platform',
      description: 'Perfect for daycare networks and franchises. Manage multiple locations from a single dashboard while keeping data separate and secure for each center.',
      icon: 'bi-buildings',
      highlight: 'Scale with ease'
    }
  ];

  benefits = [
    { icon: 'bi-clock', title: 'Save 10+ Hours Weekly', description: 'Automate repetitive tasks and focus on what matters most' },
    { icon: 'bi-heart', title: 'Happier Parents', description: 'Real-time updates build trust and strengthen relationships' },
    { icon: 'bi-shield-check', title: 'Stay Compliant', description: 'Accurate records and reporting for licensing requirements' },
    { icon: 'bi-graph-up', title: 'Grow Your Business', description: 'Streamlined operations make it easy to scale' }
  ];
}
