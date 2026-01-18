import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  MessageCircle, 
  Mail, 
  HelpCircle, 
  FileQuestion,
  ChevronDown,
  Send
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const faqs = [
  {
    question: 'Como faço para assinar um plano?',
    answer: 'Para assinar um plano, acesse a página de Planos, escolha o plano que melhor atende suas necessidades e siga as instruções de pagamento. Após a confirmação do pagamento, seu acesso será liberado automaticamente.',
  },
  {
    question: 'Posso assistir em quantos dispositivos?',
    answer: 'O número de dispositivos varia de acordo com seu plano. O plano mensal permite até 2 dispositivos simultâneos, enquanto o plano anual permite até 5 dispositivos.',
  },
  {
    question: 'Como faço para cancelar minha assinatura?',
    answer: 'Para cancelar sua assinatura, entre em contato conosco através do formulário de suporte ou envie um e-mail para nosso suporte. Processaremos seu cancelamento em até 24 horas.',
  },
  {
    question: 'Os conteúdos têm legenda em português?',
    answer: 'Sim! Todos os nossos conteúdos possuem legendas em português. Alguns títulos também estão disponíveis dublados.',
  },
  {
    question: 'Como acesso o conteúdo +18?',
    answer: 'Para acessar conteúdo +18, você precisa ter uma assinatura ativa e adquirir o acesso adulto separadamente. Este recurso está disponível apenas para maiores de 18 anos.',
  },
  {
    question: 'Esqueci minha senha, o que faço?',
    answer: 'Na página de login, clique em "Esqueci minha senha" e siga as instruções enviadas para seu e-mail cadastrado para redefinir sua senha.',
  },
];

export default function Support() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 1500));

    toast.success('Mensagem enviada com sucesso! Retornaremos em breve.');
    setFormData({ name: '', email: '', subject: '', message: '' });
    setLoading(false);
  };

  return (
    <Layout>
      <div className="min-h-screen py-20">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full brand-gradient mb-6">
              <MessageCircle className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Central de <span className="brand-gradient-text">Suporte</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Estamos aqui para ajudar! Encontre respostas para suas dúvidas ou entre em contato conosco.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {/* FAQ Section */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <HelpCircle className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold">Perguntas Frequentes</h2>
              </div>

              <Accordion type="single" collapsible className="space-y-4">
                {faqs.map((faq, index) => (
                  <AccordionItem
                    key={index}
                    value={`item-${index}`}
                    className="bg-card border border-border rounded-lg px-6"
                  >
                    <AccordionTrigger className="text-left hover:no-underline py-4">
                      <span className="font-medium">{faq.question}</span>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pb-4">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>

            {/* Contact Form */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <Mail className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold">Entre em Contato</h2>
              </div>

              <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      placeholder="Seu nome"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Assunto</Label>
                  <Input
                    id="subject"
                    placeholder="Qual o assunto?"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Mensagem</Label>
                  <Textarea
                    id="message"
                    placeholder="Descreva sua dúvida ou problema..."
                    rows={5}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full brand-gradient glow-primary gap-2"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white" />
                  ) : (
                    <>
                      <Send className="h-5 w-5" />
                      Enviar Mensagem
                    </>
                  )}
                </Button>
              </form>

              {/* Additional Contact Info */}
              <div className="mt-8 p-6 bg-card border border-border rounded-xl">
                <h3 className="font-semibold mb-4">Outras formas de contato</h3>
                <div className="space-y-3 text-muted-foreground">
                  <p className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-primary" />
                    suporte@dramaflix.com.br
                  </p>
                  <p className="text-sm">
                    Respondemos em até 24 horas úteis.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
