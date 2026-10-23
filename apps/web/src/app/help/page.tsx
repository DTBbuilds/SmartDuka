'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  HelpCircle,
  BookOpen,
  MessageCircle,
  Mail,
  Phone,
  FileText,
  ShoppingCart,
  Package,
  Users,
  CreditCard,
  BarChart3,
  ChevronDown,
  Search,
  Inbox,
  ArrowRight,
  SearchX,
} from 'lucide-react';

// QUALITY-CORE1 P1-D: every FAQ carries a categoryId so the Quick Links act
// as real category filters and the search covers both articles and categories.
const faqs = [
  {
    category: 'getting-started',
    question: 'How do I add a new product to inventory?',
    answer: 'Navigate to Inventory > Products, then click the "Add Product" button. Fill in the product details including name, SKU, price, and quantity, then save.',
  },
  {
    category: 'pos',
    question: 'How do I process a sale?',
    answer: 'Go to the POS screen, scan or search for products to add them to the cart. Once done, select a payment method and complete the transaction.',
  },
  {
    category: 'users',
    question: 'How do I add a new user/staff member?',
    answer: 'Navigate to Users section, click "Add User", fill in their details and assign appropriate role (Cashier, Manager, etc.).',
  },
  {
    category: 'reports',
    question: 'How do I view sales reports?',
    answer: 'Go to Reports section where you can view daily, weekly, and monthly sales summaries, top products, and revenue analytics.',
  },
  {
    category: 'payments',
    question: 'How do I set up M-Pesa payments?',
    answer: 'Go to Settings > Payments, enter your M-Pesa Paybill/Till number and configure the integration settings.',
  },
  {
    category: 'getting-started',
    question: 'How do I manage multiple branches?',
    answer: 'If you have a multi-branch subscription, go to Settings > Branches to add and manage your store locations.',
  },
];

const quickLinks = [
  { id: 'getting-started', title: 'Getting Started', description: 'Learn the basics of SmartDuka', icon: BookOpen },
  { id: 'pos', title: 'POS Guide', description: 'How to process sales', icon: ShoppingCart },
  { id: 'inventory', title: 'Inventory Management', description: 'Managing your products', icon: Package },
  { id: 'users', title: 'User Management', description: 'Adding and managing staff', icon: Users },
  { id: 'payments', title: 'Payments', description: 'Payment methods and M-Pesa', icon: CreditCard },
  { id: 'reports', title: 'Reports', description: 'Understanding your analytics', icon: BarChart3 },
];

// QUALITY-CORE1 P1-D: tel: hrefs must be dialable — digits only, with the
// international prefix. Display text keeps the human-readable form.
const contactChannels = [
  {
    icon: Mail,
    title: 'Email Support',
    detail: 'smartdukainfo@gmail.com',
    href: 'mailto:smartdukainfo@gmail.com',
    hrefLabel: 'Email SmartDuka support',
  },
  {
    icon: Phone,
    title: 'Phone Support',
    detail: '0450 275 013 (AU) / 0727 068 107 (KE)',
    href: 'tel:+61450275013',
    altHref: 'tel:+254727068107',
    hrefLabel: 'Call Australian support line',
    altHrefLabel: 'Call Kenyan support line',
  },
  {
    icon: MessageCircle,
    title: 'Live Chat',
    detail: 'Available 9am - 6pm EAT',
    href: '/inbox',
    hrefLabel: 'Open support inbox',
  },
];

function FAQItem({
  question,
  answer,
  open,
  onToggle,
}: {
  question: string;
  answer: string;
  open: boolean;
  onToggle: () => void;
}) {
  // QUALITY-CORE1 P1-D: accessible disclosure — aria-expanded/aria-controls on
  // the trigger, a labelled region for the answer, and a >=44px touch target.
  const answerId = `faq-answer-${question.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div className="border-b last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={answerId}
        className="w-full flex items-center justify-between gap-3 min-h-[48px] py-4 text-left font-medium hover:text-primary transition-colors"
      >
        <span>{question}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>
      <div
        id={answerId}
        role="region"
        aria-label={question}
        hidden={!open}
        className="pb-4 text-muted-foreground"
      >
        {answer}
      </div>
    </div>
  );
}

export default function HelpPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);

  const filteredFaqs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return faqs.filter((faq) => {
      const matchesCategory = !activeCategory || faq.category === activeCategory;
      const matchesQuery =
        !q ||
        faq.question.toLowerCase().includes(q) ||
        faq.answer.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [query, activeCategory]);

  const filteredQuickLinks = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return quickLinks;
    return quickLinks.filter(
      (link) =>
        link.title.toLowerCase().includes(q) ||
        link.description.toLowerCase().includes(q),
    );
  }, [query]);

  const hasQuery = query.trim().length > 0;
  const nothingFound = hasQuery && filteredFaqs.length === 0 && filteredQuickLinks.length === 0;

  return (
    <div className="container mx-auto py-6 sm:py-8 px-4 max-w-5xl">
      <div className="flex items-center gap-3 mb-6 sm:mb-8">
        <HelpCircle className="h-7 w-7 sm:h-8 sm:w-8 text-primary shrink-0" aria-hidden="true" />
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Help Center</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Find answers and get support</p>
        </div>
      </div>

      {/* Search — QUALITY-CORE1 P1-D: article discovery on mobile */}
      <section className="mb-8" aria-label="Search the Help Center">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search help articles…"
            aria-label="Search help articles"
            className="w-full h-11 pl-10 pr-4 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </section>

      {/* Direct Support Chat */}
      <section className="mb-8 sm:mb-10">
        <Card className="border-primary/40 bg-primary/5">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-3 rounded-lg bg-primary/10 shrink-0">
                  <Inbox className="h-6 w-6 text-primary" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <CardTitle>Need Direct Support?</CardTitle>
                  <CardDescription>
                    Chat directly with our support team for personalized help
                  </CardDescription>
                </div>
              </div>
              <Button onClick={() => router.push('/inbox')} className="gap-2 min-h-[44px]">
                Open Inbox
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Start a conversation with SmartDuka support for billing questions, technical issues,
              feature requests, or any other inquiries. Our team typically responds within 24 hours.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Quick Links — act as real category filters */}
      {filteredQuickLinks.length > 0 && (
        <section className="mb-8 sm:mb-10" aria-label="Browse by topic">
          <h2 className="text-xl font-semibold mb-4">Quick Links</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredQuickLinks.map((link) => {
              const active = activeCategory === link.id;
              return (
                <Card
                  key={link.id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={active}
                  onClick={() => {
                    setActiveCategory(active ? null : link.id);
                    setOpenQuestion(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setActiveCategory(active ? null : link.id);
                      setOpenQuestion(null);
                    }
                  }}
                  className={`hover:shadow-md transition-shadow cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    active ? 'border-primary ring-1 ring-primary' : ''
                  }`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <link.icon className="h-5 w-5 text-primary shrink-0" aria-hidden="true" />
                      <CardTitle className="text-base">{link.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{link.description}</CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* FAQs */}
      <section className="mb-8 sm:mb-10" aria-label="Frequently asked questions">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h2 className="text-xl font-semibold">Frequently Asked Questions</h2>
          {(activeCategory || hasQuery) && (
            <Button
              variant="outline"
              size="sm"
              className="min-h-[36px]"
              onClick={() => {
                setActiveCategory(null);
                setQuery('');
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
        <Card>
          <CardContent className="pt-6">
            {filteredFaqs.length === 0 ? (
              <div className="py-10 text-center" role="status">
                <SearchX className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" aria-hidden="true" />
                <p className="font-medium">No matching articles</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Try a different search term or clear the filters.
                </p>
              </div>
            ) : (
              filteredFaqs.map((faq) => (
                <FAQItem
                  key={faq.question}
                  question={faq.question}
                  answer={faq.answer}
                  open={openQuestion === faq.question}
                  onToggle={() =>
                    setOpenQuestion(openQuestion === faq.question ? null : faq.question)
                  }
                />
              ))
            )}
          </CardContent>
        </Card>
      </section>

      {/* Contact Support */}
      <section aria-label="Contact support">
        <h2 className="text-xl font-semibold mb-4">Contact Support</h2>
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {contactChannels.map((channel) => (
                <div key={channel.title} className="flex items-start gap-3">
                  <channel.icon className="h-5 w-5 text-primary mt-0.5 shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="font-medium">{channel.title}</p>
                    {channel.altHref ? (
                      <div className="text-sm text-muted-foreground flex flex-col gap-1">
                        <a href={channel.href} aria-label={channel.hrefLabel} className="hover:text-primary hover:underline min-h-[24px]">
                          0450 275 013 (AU)
                        </a>
                        <a href={channel.altHref} aria-label={channel.altHrefLabel} className="hover:text-primary hover:underline min-h-[24px]">
                          0727 068 107 (KE)
                        </a>
                      </div>
                    ) : channel.href.startsWith('/') ? (
                      <button
                        type="button"
                        onClick={() => router.push(channel.href)}
                        className="text-sm text-muted-foreground hover:text-primary hover:underline text-left min-h-[24px]"
                      >
                        {channel.detail}
                      </button>
                    ) : (
                      <a
                        href={channel.href}
                        aria-label={channel.hrefLabel}
                        className="text-sm text-muted-foreground hover:text-primary hover:underline break-all min-h-[24px]"
                      >
                        {channel.detail}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-6 border-t">
              <Button
                className="w-full sm:w-auto min-h-[44px]"
                onClick={() => router.push('/support')}
              >
                <FileText className="h-4 w-4 mr-2" aria-hidden="true" />
                More ways to get help
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
