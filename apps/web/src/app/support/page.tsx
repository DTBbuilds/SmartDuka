'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Textarea,
} from '@smartduka/ui';
import {
  Mail,
  Phone,
  MessageSquare,
  ArrowLeft,
  Send,
  Clock,
  MapPin,
  ExternalLink,
  Headphones,
} from 'lucide-react';

export default function SupportPage() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const contactInfo = {
    email: 'smartdukainfo@gmail.com',
    phones: ['0729983567', '0104160502'],
    hours: 'Monday - Friday: 8:00 AM - 6:00 PM',
    location: 'Nairobi, Kenya',
  };

  const handleOpenInbox = () => {
    if (user && token) {
      router.push('/inbox');
    } else {
      router.push('/login?redirect=/inbox');
    }
  };

  const handleSendEmail = () => {
    const mailtoLink = `mailto:${contactInfo.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    window.open(mailtoLink, '_blank');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10">
              <Headphones className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Contact Support</h1>
              <p className="text-muted-foreground">
                We're here to help you with any questions or issues
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Contact Methods */}
          <div className="space-y-4">
            {/* Inbox - Recommended */}
            <Card className="border-primary/50 bg-primary/5">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">In-App Messaging</CardTitle>
                  <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                    Recommended
                  </span>
                </div>
                <CardDescription>
                  Get faster responses through our built-in messaging system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleOpenInbox} className="w-full">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Open Inbox
                </Button>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Average response time: 2-4 hours
                </p>
              </CardContent>
            </Card>

            {/* Email */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-lg">Email Support</CardTitle>
                </div>
                <CardDescription>
                  Send us an email for detailed inquiries
                </CardDescription>
              </CardHeader>
              <CardContent>
                <a
                  href={`mailto:${contactInfo.email}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                >
                  <span className="font-medium">{contactInfo.email}</span>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </a>
              </CardContent>
            </Card>

            {/* Phone */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-green-600" />
                  <CardTitle className="text-lg">Phone Support</CardTitle>
                </div>
                <CardDescription>
                  Call us directly for urgent matters
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {contactInfo.phones.map((phone) => (
                  <a
                    key={phone}
                    href={`tel:${phone}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                  >
                    <span className="font-medium">{phone}</span>
                    <Phone className="h-4 w-4 text-muted-foreground" />
                  </a>
                ))}
              </CardContent>
            </Card>

            {/* Business Hours */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Business Hours</p>
                    <p className="text-sm text-muted-foreground">
                      {contactInfo.hours}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 mt-4">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Location</p>
                    <p className="text-sm text-muted-foreground">
                      {contactInfo.location}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Message Form */}
          <Card>
            <CardHeader>
              <CardTitle>Send a Quick Message</CardTitle>
              <CardDescription>
                Fill out the form below and we'll get back to you
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Subject
                </label>
                <Input
                  placeholder="What can we help you with?"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Message
                </label>
                <Textarea
                  placeholder="Describe your issue or question in detail..."
                  rows={6}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleSendEmail}
                  disabled={!subject || !message}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Send via Email
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleOpenInbox}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send via Inbox
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* FAQ Link */}
        <div className="mt-8 text-center">
          <p className="text-muted-foreground">
            Looking for quick answers?{' '}
            <Button variant="link" className="p-0 h-auto" onClick={() => router.push('/help')}>
              Check our FAQ
            </Button>
          </p>
        </div>
      </div>
    </div>
  );
}
