import { Injectable } from '@angular/core';
import {
  QueryCategory,
  AIRiskLevel,
  QueryClassification,
  BlockedQueryPattern,
  SafeQuery
} from '../interfaces/ai-compliance.interface';

/**
 * AI Query Classifier Service
 *
 * Classifies incoming queries to ensure GDPR & EU AI Act compliance.
 * Blocks queries that would access individual child data without proper consent.
 *
 * Compliance:
 * - GDPR Article 8: Protection of children's personal data
 * - EU AI Act: High-risk AI system requirements
 */
@Injectable({
  providedIn: 'root'
})
export class AIQueryClassifierService {

  // Patterns that indicate queries about specific children (BLOCKED)
  private readonly individualChildPatterns: BlockedQueryPattern[] = [
    {
      pattern: /\b(which|what|who)\s+(child|children|kid|kids)\s+(has|have|had|need|needs)\s+(allerg|medication|special need|disabilit)/i,
      reason: 'Query requests individual child health/medical information',
      category: QueryCategory.BLOCKED,
      suggestedAlternative: 'For allergy information, please check directly with your child\'s teacher or the administration.'
    },
    {
      pattern: /\b(show|list|get|display)\s+(me\s+)?(child|children|kid|kids)('s|s')?\s+(emergency|contact|parent|guardian)/i,
      reason: 'Query requests individual child contact information',
      category: QueryCategory.BLOCKED,
      suggestedAlternative: 'Contact information is available in the parent portal under your child\'s profile.'
    },
    {
      pattern: /\b(what|how)\s+(did|does|is|was)\s+(\w+)\s+(eat|do|behave|perform|sleep|nap)/i,
      reason: 'Query requests individual child activity/behavior data',
      category: QueryCategory.BLOCKED,
      suggestedAlternative: 'Daily activity reports for your child are available in the Activities section.'
    },
    {
      pattern: /\b(incident|accident|injury|hurt)\s+(report|for|about)/i,
      reason: 'Query requests sensitive incident information',
      category: QueryCategory.BLOCKED,
      suggestedAlternative: 'Incident reports are confidential. Please contact administration directly.'
    },
    {
      pattern: /\b(diaper|toilet|potty)\s+(change|training|need)/i,
      reason: 'Query requests individual child care information',
      category: QueryCategory.BLOCKED,
      suggestedAlternative: 'Care schedules are managed by teachers. Check your child\'s daily report.'
    },
    {
      pattern: /\b(analyze|assess|evaluate|compare|rank)\s+(child|children|kid|kids|student|students)/i,
      reason: 'Query attempts to profile or compare children',
      category: QueryCategory.BLOCKED,
      suggestedAlternative: 'Child assessments are not available through AI. Please speak with teachers directly.'
    },
    {
      pattern: /\b(photo|picture|image)\s+(of|with|showing)\s+(child|children|kid|kids)/i,
      reason: 'Query requests child photos',
      category: QueryCategory.BLOCKED,
      suggestedAlternative: 'Photos are available in the Gallery section with appropriate permissions.'
    },
    {
      pattern: /\bchild(ren)?('s)?\s+(by|grouped by|sorted by|list by)\s+(age|group|class)/i,
      reason: 'Query requests child categorization data',
      category: QueryCategory.BLOCKED,
      suggestedAlternative: 'Class rosters are available to teachers in the Classes section.'
    },
    {
      pattern: /\b(medication|medicine|drug)\s+(given|administered|schedule)/i,
      reason: 'Query requests medication information',
      category: QueryCategory.BLOCKED,
      suggestedAlternative: 'Medication records are confidential. Contact administration for this information.'
    },
    {
      pattern: /\bstaff\s+schedule/i,
      reason: 'Query requests staff personal schedule data',
      category: QueryCategory.BLOCKED,
      suggestedAlternative: 'Staff schedules are internal. Contact administration for staffing questions.'
    }
  ];

  // Patterns for aggregate data queries (ALLOWED with aggregate response)
  private readonly aggregatePatterns: RegExp[] = [
    /\b(how many|count|total|number of)\s+(child|children|kid|kids|student|students)\s+(present|absent|today|enrolled)/i,
    /\b(attendance)\s+(rate|percentage|summary|overview)/i,
    /\b(fee|payment)\s+(summary|total|overview|report)/i,
    /\b(menu|meal)\s+(this week|today|tomorrow|weekly)/i,
    /\b(upcoming|scheduled|next)\s+(event|events|activity|activities)/i
  ];

  // Safe patterns that don't access any personal data
  private readonly safePatterns: RegExp[] = [
    /\b(daycare|nursery|school)\s+(hour|hours|time|schedule|open|close)/i,
    /\b(how|what)\s+(do|can|to)\s+(i|we)\s+(request|submit|make|enroll|register|pay)/i,
    /\b(fee|payment)\s+(structure|process|method|how)/i,
    /\b(document|paper|form)\s+(need|required|necessary)/i,
    /\b(contact|reach|call|email)\s+(admin|support|teacher|staff)/i,
    /\b(policy|policies|rule|rules|guideline)/i,
    /\b(hello|hi|hey|ciao|buongiorno|grazie|thank)/i,
    /\b(help|assist|support)\s+(me|with)/i,
    /\b(what is|explain|tell me about)\s+(miniminds|the app|this app)/i,
    /\b(translate|translation)/i,
    /\b(holiday|vacation|closure|closed)/i
  ];

  /**
   * Classify a query for safety and compliance
   */
  classifyQuery(query: string): QueryClassification {
    const normalizedQuery = query.toLowerCase().trim();

    // Check for blocked patterns first (highest priority)
    for (const blocked of this.individualChildPatterns) {
      if (blocked.pattern.test(normalizedQuery)) {
        return {
          category: QueryCategory.BLOCKED,
          riskLevel: AIRiskLevel.PROHIBITED,
          requiresConsent: false,
          requiresHumanReview: true,
          blockedReason: blocked.reason,
          dataCategories: ['individual_child_data'],
          suggestedAlternative: blocked.suggestedAlternative
        };
      }
    }

    // Check for safe patterns (no data access)
    for (const safe of this.safePatterns) {
      if (safe.test(normalizedQuery)) {
        return {
          category: QueryCategory.SAFE,
          riskLevel: AIRiskLevel.MINIMAL,
          requiresConsent: false,
          requiresHumanReview: false,
          dataCategories: []
        };
      }
    }

    // Check for aggregate patterns (statistical data only)
    for (const aggregate of this.aggregatePatterns) {
      if (aggregate.test(normalizedQuery)) {
        return {
          category: QueryCategory.AGGREGATE,
          riskLevel: AIRiskLevel.LOW,
          requiresConsent: false,
          requiresHumanReview: false,
          dataCategories: ['aggregate_statistics']
        };
      }
    }

    // Check for child name mentions (potential individual query)
    if (this.containsChildNamePattern(normalizedQuery)) {
      return {
        category: QueryCategory.BLOCKED,
        riskLevel: AIRiskLevel.PROHIBITED,
        requiresConsent: false,
        requiresHumanReview: true,
        blockedReason: 'Query appears to reference a specific child',
        dataCategories: ['individual_child_data'],
        suggestedAlternative: 'For information about your child, please check the Activities or Profile section directly.'
      };
    }

    // Default: treat as safe but log for review
    return {
      category: QueryCategory.SAFE,
      riskLevel: AIRiskLevel.MINIMAL,
      requiresConsent: false,
      requiresHumanReview: false,
      dataCategories: []
    };
  }

  /**
   * Check if query contains patterns suggesting a child's name
   */
  private containsChildNamePattern(query: string): boolean {
    // Patterns that suggest querying about a specific person
    const namePatterns = [
      /\b(what|how|where|when)\s+(did|does|is|was|has)\s+[A-Z][a-z]+\s/i,
      /\b(show|tell|get)\s+(me\s+)?(about\s+)?[A-Z][a-z]+('s)?\s/i,
      /\b[A-Z][a-z]+('s)?\s+(activity|attendance|meal|nap|report)/i
    ];

    return namePatterns.some(pattern => pattern.test(query));
  }

  /**
   * Get safe suggested queries for the UI
   */
  getSafeQueries(): SafeQuery[] {
    return [
      {
        query: 'What are the daycare hours?',
        queryIt: 'Quali sono gli orari dell\'asilo?',
        category: QueryCategory.SAFE,
        description: 'Get information about opening and closing times',
        descriptionIt: 'Informazioni sugli orari di apertura e chiusura'
      },
      {
        query: 'How do I request leave for my child?',
        queryIt: 'Come posso richiedere un permesso per mio figlio?',
        category: QueryCategory.SAFE,
        description: 'Learn how to submit absence requests',
        descriptionIt: 'Scopri come inviare richieste di assenza'
      },
      {
        query: 'Explain the fee payment process',
        queryIt: 'Spiega il processo di pagamento delle rette',
        category: QueryCategory.SAFE,
        description: 'Understand how to pay daycare fees',
        descriptionIt: 'Capire come pagare le rette'
      },
      {
        query: 'What\'s on the menu this week?',
        queryIt: 'Cosa c\'è nel menu di questa settimana?',
        category: QueryCategory.AGGREGATE,
        description: 'View the weekly meal plan',
        descriptionIt: 'Visualizza il menu settimanale'
      },
      {
        query: 'How do I update my contact information?',
        queryIt: 'Come aggiorno i miei dati di contatto?',
        category: QueryCategory.SAFE,
        description: 'Learn how to edit your profile',
        descriptionIt: 'Scopri come modificare il tuo profilo'
      },
      {
        query: 'What documents do I need for enrollment?',
        queryIt: 'Quali documenti servono per l\'iscrizione?',
        category: QueryCategory.SAFE,
        description: 'Get the enrollment requirements checklist',
        descriptionIt: 'Ottieni la lista dei documenti per l\'iscrizione'
      },
      {
        query: 'Show upcoming events',
        queryIt: 'Mostra i prossimi eventi',
        category: QueryCategory.AGGREGATE,
        description: 'See scheduled activities and events',
        descriptionIt: 'Visualizza le attività e gli eventi programmati'
      },
      {
        query: 'How many children are present today?',
        queryIt: 'Quanti bambini sono presenti oggi?',
        category: QueryCategory.AGGREGATE,
        description: 'Get today\'s attendance count',
        descriptionIt: 'Ottieni il conteggio delle presenze di oggi'
      },
      {
        query: 'What are the holiday closures?',
        queryIt: 'Quali sono i giorni di chiusura festiva?',
        category: QueryCategory.SAFE,
        description: 'View scheduled holidays',
        descriptionIt: 'Visualizza le festività programmate'
      },
      {
        query: 'Help me write a parent announcement',
        queryIt: 'Aiutami a scrivere un annuncio per i genitori',
        category: QueryCategory.SAFE,
        description: 'Get help drafting communications',
        descriptionIt: 'Ottieni aiuto per redigere comunicazioni'
      }
    ];
  }

  /**
   * Get blocked response message with alternative
   */
  getBlockedResponse(classification: QueryClassification, lang: 'en' | 'it' = 'it'): string {
    const messages = {
      en: {
        prefix: '🔒 I cannot process this request.',
        reason: `Reason: ${classification.blockedReason}`,
        alternative: classification.suggestedAlternative
          ? `\n\n💡 Alternative: ${classification.suggestedAlternative}`
          : '',
        contact: '\n\n👤 For assistance, please contact the daycare administration directly or speak with your child\'s teacher.'
      },
      it: {
        prefix: '🔒 Non posso elaborare questa richiesta.',
        reason: `Motivo: ${this.translateReason(classification.blockedReason || '')}`,
        alternative: classification.suggestedAlternative
          ? `\n\n💡 Alternativa: ${this.translateAlternative(classification.suggestedAlternative)}`
          : '',
        contact: '\n\n👤 Per assistenza, contatta direttamente l\'amministrazione dell\'asilo o parla con l\'educatore di tuo figlio.'
      }
    };

    const m = messages[lang];
    return `${m.prefix}\n${m.reason}${m.alternative}${m.contact}`;
  }

  private translateReason(reason: string): string {
    const translations: Record<string, string> = {
      'Query requests individual child health/medical information': 'La richiesta riguarda informazioni sanitarie individuali del bambino',
      'Query requests individual child contact information': 'La richiesta riguarda informazioni di contatto individuali',
      'Query requests individual child activity/behavior data': 'La richiesta riguarda dati di attività/comportamento individuali',
      'Query requests sensitive incident information': 'La richiesta riguarda informazioni sensibili sugli incidenti',
      'Query requests individual child care information': 'La richiesta riguarda informazioni di cura individuali',
      'Query attempts to profile or compare children': 'La richiesta tenta di profilare o confrontare i bambini',
      'Query requests child photos': 'La richiesta riguarda foto dei bambini',
      'Query requests child categorization data': 'La richiesta riguarda dati di categorizzazione dei bambini',
      'Query requests medication information': 'La richiesta riguarda informazioni sui farmaci',
      'Query requests staff personal schedule data': 'La richiesta riguarda dati personali del personale',
      'Query appears to reference a specific child': 'La richiesta sembra riferirsi a un bambino specifico'
    };
    return translations[reason] || reason;
  }

  private translateAlternative(alternative: string): string {
    const translations: Record<string, string> = {
      'For allergy information, please check directly with your child\'s teacher or the administration.':
        'Per informazioni sulle allergie, contatta direttamente l\'educatore di tuo figlio o l\'amministrazione.',
      'Contact information is available in the parent portal under your child\'s profile.':
        'Le informazioni di contatto sono disponibili nel portale genitori sotto il profilo di tuo figlio.',
      'Daily activity reports for your child are available in the Activities section.':
        'I report giornalieri delle attività di tuo figlio sono disponibili nella sezione Attività.',
      'Incident reports are confidential. Please contact administration directly.':
        'I report degli incidenti sono riservati. Contatta direttamente l\'amministrazione.',
      'Care schedules are managed by teachers. Check your child\'s daily report.':
        'Gli orari di cura sono gestiti dagli educatori. Controlla il report giornaliero di tuo figlio.',
      'Child assessments are not available through AI. Please speak with teachers directly.':
        'Le valutazioni dei bambini non sono disponibili tramite AI. Parla direttamente con gli educatori.',
      'Photos are available in the Gallery section with appropriate permissions.':
        'Le foto sono disponibili nella sezione Galleria con le appropriate autorizzazioni.',
      'Class rosters are available to teachers in the Classes section.':
        'Gli elenchi delle classi sono disponibili per gli educatori nella sezione Classi.',
      'Medication records are confidential. Contact administration for this information.':
        'I registri dei farmaci sono riservati. Contatta l\'amministrazione per queste informazioni.',
      'Staff schedules are internal. Contact administration for staffing questions.':
        'Gli orari del personale sono interni. Contatta l\'amministrazione per domande sul personale.',
      'For information about your child, please check the Activities or Profile section directly.':
        'Per informazioni su tuo figlio, controlla direttamente la sezione Attività o Profilo.'
    };
    return translations[alternative] || alternative;
  }
}
