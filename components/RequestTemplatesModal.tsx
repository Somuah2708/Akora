import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { X, FileText, Check } from 'lucide-react-native';

interface RequestTemplatesModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectTemplate: (template: RequestTemplate) => void;
}

export interface RequestTemplate {
  id: string;
  title: string;
  description: string;
  message: string;
  suggestedAreas: string[];
}

const REQUEST_TEMPLATES: RequestTemplate[] = [
  {
    id: 'career-advice',
    title: 'Career Advice & Guidance',
    description: 'General career path discussion and professional development',
    message: `Hello! I'm interested in learning more about your career journey and would appreciate your guidance on professional development.

I'm currently exploring career paths in [YOUR FIELD] and would love to hear about:
• Your transition into this field
• Key skills that have been most valuable
• Advice for someone starting out
• Any challenges you faced and how you overcame them

I'm flexible with timing and happy to work around your schedule. A 30-45 minute conversation would be incredibly helpful.

Thank you for considering my request!`,
    suggestedAreas: ['Career Planning', 'Professional Development', 'Industry Insights'],
  },
  {
    id: 'interview-prep',
    title: 'Interview Preparation',
    description: 'Mock interviews and tips for job applications',
    message: `Hello! I have upcoming interviews and would greatly appreciate your help with interview preparation.

Specifically, I'm looking for guidance on:
• Common interview questions in [INDUSTRY/ROLE]
• How to effectively showcase my experience
• Technical/behavioral interview strategies
• Feedback on my current approach

I would be grateful for:
• A mock interview session (30-60 minutes)
• Review of my responses and body language
• Tips specific to [COMPANY/ROLE TYPE]

Thank you for considering this request. I'm happy to work around your schedule!`,
    suggestedAreas: ['Interview Skills', 'Job Search', 'Communication Skills'],
  },
  {
    id: 'resume-review',
    title: 'Resume & LinkedIn Review',
    description: 'Feedback on resume, cover letter, and LinkedIn profile',
    message: `Hello! I would appreciate your professional perspective on my resume and LinkedIn profile.

I'm currently applying for [TYPE OF POSITIONS] and want to ensure my materials effectively highlight my experience and skills.

I'm seeking feedback on:
• Overall resume structure and content
• How to better showcase my achievements
• LinkedIn profile optimization
• Industry-specific keywords and formatting

I can share my materials in advance and would value 20-30 minutes of your time for a review session.

Thank you for considering my request!`,
    suggestedAreas: ['Resume Writing', 'Personal Branding', 'Job Search'],
  },
  {
    id: 'skill-development',
    title: 'Skill Development Plan',
    description: 'Guidance on learning new skills and professional growth',
    message: `Hello! I'm working on developing my skills in [SPECIFIC AREA] and would appreciate your mentorship.

Background:
• Current experience level: [BEGINNER/INTERMEDIATE/ADVANCED]
• Goal: [WHAT YOU WANT TO ACHIEVE]
• Timeline: [WHEN YOU WANT TO ACHIEVE IT]

I'm seeking guidance on:
• Most important skills to prioritize
• Recommended learning resources
• Practical projects to build experience
• How to demonstrate these skills professionally

A 30-45 minute session to discuss a learning roadmap would be incredibly valuable.

Thank you for your time and consideration!`,
    suggestedAreas: ['Skill Development', 'Learning Strategy', 'Professional Growth'],
  },
  {
    id: 'industry-transition',
    title: 'Industry Transition',
    description: 'Switching careers or entering a new industry',
    message: `Hello! I'm in the process of transitioning into [NEW INDUSTRY/FIELD] from [CURRENT FIELD] and would value your insights.

About my transition:
• Current background: [BRIEF DESCRIPTION]
• Target role/industry: [WHAT YOU'RE TARGETING]
• Key concerns: [YOUR MAIN QUESTIONS/WORRIES]

I would appreciate guidance on:
• How to leverage my existing skills
• Skills gaps I should address
• Networking strategies for this industry
• Common pitfalls to avoid
• Realistic timeline and expectations

A 45-60 minute conversation would be extremely helpful as I navigate this transition.

Thank you for considering my request!`,
    suggestedAreas: ['Career Change', 'Industry Insights', 'Networking'],
  },
  {
    id: 'networking-strategies',
    title: 'Networking & Building Connections',
    description: 'Professional networking and relationship building',
    message: `Hello! I'm looking to expand my professional network in [INDUSTRY/FIELD] and would appreciate your advice.

Current situation:
• Experience level: [YOUR LEVEL]
• Networking goals: [WHAT YOU WANT TO ACHIEVE]
• Challenges: [WHAT YOU'RE STRUGGLING WITH]

I'd love to learn about:
• Effective networking strategies in this field
• How to build meaningful professional relationships
• Leveraging LinkedIn and other platforms
• Industry events and communities to join
• Following up and maintaining connections

A 30-minute session would be incredibly valuable.

Thank you for your time!`,
    suggestedAreas: ['Networking', 'Relationship Building', 'Professional Community'],
  },
  {
    id: 'startup-advice',
    title: 'Startup & Entrepreneurship',
    description: 'Starting a business or working in startup environment',
    message: `Hello! I'm [STARTING A BUSINESS/JOINING A STARTUP] and would greatly value your entrepreneurial insights.

Context:
• Business/role: [BRIEF DESCRIPTION]
• Stage: [IDEA/EARLY/GROWTH]
• Key challenges: [MAIN CONCERNS]

I'm seeking advice on:
• Critical success factors for early-stage ventures
• Common mistakes to avoid
• Building the right team
• Product-market fit validation
• Fundraising/sustainable growth strategies

A 45-60 minute mentorship session would be incredibly helpful.

Thank you for considering this!`,
    suggestedAreas: ['Entrepreneurship', 'Startup Strategy', 'Business Development'],
  },
  {
    id: 'work-life-balance',
    title: 'Work-Life Balance',
    description: 'Managing career ambitions with personal well-being',
    message: `Hello! I'm reaching out to seek guidance on maintaining a healthy work-life balance while pursuing career goals.

Current situation:
• Role/responsibilities: [BRIEF DESCRIPTION]
• Main challenges: [WHAT YOU'RE STRUGGLING WITH]
• Goals: [WHAT YOU WANT TO ACHIEVE]

I'd appreciate insights on:
• Time management strategies
• Setting boundaries effectively
• Prioritization techniques
• Avoiding burnout
• Integrating personal and professional goals

A 30-45 minute conversation would be very helpful.

Thank you!`,
    suggestedAreas: ['Work-Life Balance', 'Time Management', 'Career Wellness'],
  },
];

export default function RequestTemplatesModal({
  visible,
  onClose,
  onSelectTemplate,
}: RequestTemplatesModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const handleSelectTemplate = (template: RequestTemplate) => {
    setSelectedTemplate(template.id);
    setTimeout(() => {
      onSelectTemplate(template);
      setSelectedTemplate(null);
      onClose();
    }, 200);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <FileText size={24} color="#10B981" />
              <Text style={styles.title}>Message Templates</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Subtitle */}
          <View style={styles.subtitleContainer}>
            <Text style={styles.subtitle}>
              Choose a template to get started. You can customize it before sending.
            </Text>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {REQUEST_TEMPLATES.map((template) => (
              <TouchableOpacity
                key={template.id}
                style={[
                  styles.templateCard,
                  selectedTemplate === template.id && styles.templateCardSelected,
                ]}
                onPress={() => handleSelectTemplate(template)}
                activeOpacity={0.7}
              >
                <View style={styles.templateHeader}>
                  <View style={styles.templateTitleRow}>
                    <Text style={styles.templateTitle}>{template.title}</Text>
                    {selectedTemplate === template.id && (
                      <View style={styles.checkIcon}>
                        <Check size={16} color="#FFFFFF" />
                      </View>
                    )}
                  </View>
                  <Text style={styles.templateDescription}>{template.description}</Text>
                </View>

                {/* Suggested Areas */}
                <View style={styles.areasContainer}>
                  {template.suggestedAreas.map((area, index) => (
                    <View key={index} style={styles.areaTag}>
                      <Text style={styles.areaTagText}>{area}</Text>
                    </View>
                  ))}
                </View>

                {/* Message Preview */}
                <View style={styles.messagePreview}>
                  <Text style={styles.messagePreviewText} numberOfLines={3}>
                    {template.message}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  subtitleContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 18,
  },
  content: {
    padding: 16,
    maxHeight: 500,
  },
  templateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  templateCardSelected: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  templateHeader: {
    marginBottom: 12,
  },
  templateTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  templateTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    flex: 1,
  },
  checkIcon: {
    backgroundColor: '#10B981',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  templateDescription: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 18,
  },
  areasContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  areaTag: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  areaTagText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#1E40AF',
  },
  messagePreview: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  messagePreviewText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 16,
  },
});
