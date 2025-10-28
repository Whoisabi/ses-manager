import dns from 'dns';
import { promisify } from 'util';

const resolveMx = promisify(dns.resolveMx);

const DISPOSABLE_DOMAINS = new Set([
  '10minutemail.com',
  'guerrillamail.com',
  'temp-mail.org',
  'tempmail.com',
  'throwaway.email',
  'mailinator.com',
  'maildrop.cc',
  'yopmail.com',
  'getnada.com',
  'trashmail.com',
  'guerrillamailblock.com',
  'sharklasers.com',
  'guerrillamail.net',
  'guerrillamail.biz',
  'spam4.me',
  'grr.la',
  'guerrillamail.de',
  'trbvm.com',
  'tmails.net',
  'mohmal.com',
  'emailondeck.com',
  'fakeinbox.com',
  'mintemail.com',
  'dispostable.com',
  'throwam.com',
  'mt2015.com',
  'mt2014.com',
  'mailcatch.com',
  'mailnesia.com',
  'tempinbox.com',
  'getairmail.com',
  'mytemp.email',
  'anonbox.net',
  'mvrht.net',
  'mailtemporaire.fr',
  'correotemporal.org',
  'rootfest.net',
  'disposableemailaddresses.com',
  '33mail.com',
  'tempr.email',
  'fakemail.net',
  'gettempmail.com',
]);

export interface EmailValidationResult {
  email: string;
  isValid: boolean;
  reason?: string;
}

export interface SanitizationResults {
  validEmails: string[];
  invalidEmails: EmailValidationResult[];
  stats: {
    total: number;
    valid: number;
    invalid: number;
    duplicates: number;
  };
}

export class EmailSanitizationService {
  private static EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  static validateFormat(email: string): boolean {
    return this.EMAIL_REGEX.test(email);
  }

  static extractDomain(email: string): string {
    const parts = email.split('@');
    return parts.length === 2 ? parts[1].toLowerCase() : '';
  }

  static isDisposableDomain(email: string): boolean {
    const domain = this.extractDomain(email);
    return DISPOSABLE_DOMAINS.has(domain);
  }

  static async checkMxRecords(email: string, retries = 2): Promise<boolean | null> {
    const domain = this.extractDomain(email);
    if (!domain) return false;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const mxRecords = await resolveMx(domain);
        return mxRecords && mxRecords.length > 0;
      } catch (error: any) {
        if (error.code === 'ENODATA' || error.code === 'ENOTFOUND') {
          return false;
        }
        
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 300 * (attempt + 1)));
          continue;
        }
        
        return null;
      }
    }
    
    return null;
  }

  static async validateEmail(
    email: string,
    options: {
      checkFormat?: boolean;
      checkDisposable?: boolean;
      checkMx?: boolean;
    } = {}
  ): Promise<EmailValidationResult> {
    const {
      checkFormat = true,
      checkDisposable = true,
      checkMx = true,
    } = options;

    const trimmedEmail = email.trim().toLowerCase();

    if (checkFormat && !this.validateFormat(trimmedEmail)) {
      return {
        email: trimmedEmail,
        isValid: false,
        reason: 'Invalid email format',
      };
    }

    if (checkDisposable && this.isDisposableDomain(trimmedEmail)) {
      return {
        email: trimmedEmail,
        isValid: false,
        reason: 'Disposable/temporary email domain',
      };
    }

    if (checkMx) {
      const hasMx = await this.checkMxRecords(trimmedEmail);
      if (hasMx === false) {
        return {
          email: trimmedEmail,
          isValid: false,
          reason: 'Domain has no valid MX records',
        };
      }
      if (hasMx === null) {
        return {
          email: trimmedEmail,
          isValid: true,
          reason: 'MX records could not be verified (network issue)',
        };
      }
    }

    return {
      email: trimmedEmail,
      isValid: true,
    };
  }

  static async sanitizeEmailList(
    emails: string[],
    options: {
      checkFormat?: boolean;
      checkDisposable?: boolean;
      checkMx?: boolean;
      removeDuplicates?: boolean;
    } = {}
  ): Promise<SanitizationResults> {
    const { removeDuplicates = true } = options;
    
    let emailsToProcess = emails.map(e => e.trim().toLowerCase()).filter(e => e.length > 0);
    
    const originalCount = emailsToProcess.length;
    let duplicatesCount = 0;

    if (removeDuplicates) {
      const uniqueEmails = new Set(emailsToProcess);
      duplicatesCount = emailsToProcess.length - uniqueEmails.size;
      emailsToProcess = Array.from(uniqueEmails);
    }

    const validationPromises = emailsToProcess.map(email =>
      this.validateEmail(email, options)
    );

    const results = await Promise.all(validationPromises);

    const validEmails: string[] = [];
    const invalidEmails: EmailValidationResult[] = [];

    results.forEach(result => {
      if (result.isValid) {
        validEmails.push(result.email);
      } else {
        invalidEmails.push(result);
      }
    });

    return {
      validEmails,
      invalidEmails,
      stats: {
        total: originalCount,
        valid: validEmails.length,
        invalid: invalidEmails.length,
        duplicates: duplicatesCount,
      },
    };
  }

  static parseEmailsFromText(text: string): string[] {
    const lines = text.split(/[\n,;]/);
    return lines
      .map(line => line.trim())
      .filter(line => line.length > 0);
  }

  static generateCsv(emails: string[]): string {
    const header = 'email\n';
    const rows = emails.map(email => `${email}`).join('\n');
    return header + rows;
  }
}
