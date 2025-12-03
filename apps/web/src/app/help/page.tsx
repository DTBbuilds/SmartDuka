'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
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
  BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const faqs = [
  {
    question: 'How do I add a new product to inventory?',
    answer: 'Navigate to Inventory > Products, then click the "Add Product" button. Fill in the product details including name, SKU, price, and quantity, then save.',
  },
  {
    question: 'How do I process a sale?',
    answer: 'Go to the POS screen, scan or search for products to add them to the cart. Once done, select a payment method and complete the transaction.',
  },
  {
    question: 'How do I add a new user/staff member?',
    answer: 'Navigate to Users section, click "Add User", fill in their details and assign appropriate role (Cashier, Manager, etc.).',
  },
  {
    question: 'How do I view sales reports?',
    answer: 'Go to Reports section where you can view daily, weekly, and monthly sales summaries, top products, and revenue analytics.',
  },
  {
    question: 'How do I set up M-Pesa payments?',
    answer: 'Go to Settings > Payments, enter your M-Pesa Paybill/Till number and configure the integration settings.',
  },
  {
    question: 'How do I manage multiple branches?',
    answer: 'If you have a multi-branch subscription, go to Settings > Branches to add and manage your store locations.',
  },
];

const quickLinks = [
  { title: 'Getting Started', description: 'Learn the basics of SmartDuka', icon: BookOpen },
  { title: 'POS Guide', description: 'How to process sales', icon: ShoppingCart },
  { title: 'Inventory Management', description: 'Managing your products', icon: Package },
  { title: 'User Management', description: 'Adding and managing staff', icon: Users },
  { title: 'Payments', description: 'Payment methods and M-Pesa', icon: CreditCard },
  { title: 'Reports', description: 'Understanding your analytics', icon: BarChart3 },
];

export default function HelpPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="flex items-center gap-3 mb-8">
        <HelpCircle className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Help Center</h1>
          <p className="text-muted-foreground">Find answers and get support</p>
        </div>
      </div>

      {/* Quick Links */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Quick Links</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickLinks.map((link) => (
            <Card key={link.title} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <link.icon className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">{link.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>{link.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* FAQs */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Frequently Asked Questions</h2>
        <Card>
          <CardContent className="pt-6">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </section>

      {/* Contact Support */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Contact Support</h2>
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Email Support</p>
                  <p className="text-sm text-muted-foreground">support@smartduka.com</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Phone Support</p>
                  <p className="text-sm text-muted-foreground">+254 700 000 000</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MessageCircle className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Live Chat</p>
                  <p className="text-sm text-muted-foreground">Available 9am - 6pm EAT</p>
                </div>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t">
              <Button className="w-full md:w-auto">
                <FileText className="h-4 w-4 mr-2" />
                View Documentation
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
