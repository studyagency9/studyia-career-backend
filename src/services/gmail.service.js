const { google } = require('googleapis');
const GmailToken = require('../models/gmailToken.model');

class GmailService {
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    this.scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/userinfo.email'
    ];
  }

  generateAuthUrl(state = '') {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: this.scopes,
      state: state,
      prompt: 'consent'
    });
  }

  async exchangeCodeForTokens(code) {
    const { tokens } = await this.oauth2Client.getToken(code);
    return tokens;
  }

  async getUserEmail(accessToken) {
    this.oauth2Client.setCredentials({ access_token: accessToken });
    const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
    const { data } = await oauth2.userinfo.get();
    return data.email;
  }

  async saveTokens(partnerId, tokens, email) {
    const expiresAt = new Date(Date.now() + (tokens.expiry_date || tokens.expires_in * 1000));
    
    let gmailToken = await GmailToken.findOne({ partnerId });
    
    if (gmailToken) {
      gmailToken.email = email;
      gmailToken.setTokens(tokens.access_token, tokens.refresh_token);
      gmailToken.expiresAt = expiresAt;
      gmailToken.scope = this.scopes.join(' ');
    } else {
      gmailToken = new GmailToken({
        partnerId,
        email,
        expiresAt,
        scope: this.scopes.join(' ')
      });
      gmailToken.setTokens(tokens.access_token, tokens.refresh_token);
    }
    
    await gmailToken.save();
    return gmailToken;
  }

  async getValidToken(partnerId) {
    const gmailToken = await GmailToken.findOne({ partnerId });
    
    if (!gmailToken) {
      throw new Error('Gmail not connected');
    }

    if (gmailToken.isExpiringSoon()) {
      console.log('[Gmail] Token expiring soon, refreshing...');
      return await this.refreshToken(gmailToken);
    }

    return gmailToken.getAccessToken();
  }

  async refreshToken(gmailToken) {
    try {
      this.oauth2Client.setCredentials({
        refresh_token: gmailToken.getRefreshToken()
      });

      const { credentials } = await this.oauth2Client.refreshAccessToken();
      
      gmailToken.setTokens(credentials.access_token, gmailToken.getRefreshToken());
      gmailToken.expiresAt = new Date(credentials.expiry_date);
      await gmailToken.save();

      console.log('[Gmail] Token refreshed successfully');
      return credentials.access_token;
    } catch (error) {
      console.error('[Gmail] Error refreshing token:', error.message);
      throw new Error('Failed to refresh Gmail token');
    }
  }

  async getGmailClient(partnerId) {
    const accessToken = await this.getValidToken(partnerId);
    this.oauth2Client.setCredentials({ access_token: accessToken });
    return google.gmail({ version: 'v1', auth: this.oauth2Client });
  }

  async listEmails(partnerId, maxResults = 20, query = 'has:attachment (filename:pdf OR filename:doc OR filename:docx)', pageToken = null) {
    const gmail = await this.getGmailClient(partnerId);
    
    const params = {
      userId: 'me',
      maxResults: parseInt(maxResults),
      q: query
    };

    if (pageToken) {
      params.pageToken = pageToken;
    }

    const { data } = await gmail.users.messages.list(params);
    
    if (!data.messages || data.messages.length === 0) {
      return { emails: [], nextPageToken: null };
    }

    const emailPromises = data.messages.map(msg => this.getEmailDetails(gmail, msg.id));
    const emails = await Promise.all(emailPromises);

    return {
      emails: emails.filter(email => email !== null),
      nextPageToken: data.nextPageToken || null
    };
  }

  async getEmailDetails(gmail, messageId) {
    try {
      const { data } = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });

      const headers = data.payload.headers;
      const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
      const from = headers.find(h => h.name === 'From')?.value || 'Unknown';
      const date = headers.find(h => h.name === 'Date')?.value || '';

      const attachments = [];
      
      const extractAttachments = (parts) => {
        if (!parts) return;
        
        parts.forEach(part => {
          if (part.filename && part.body.attachmentId) {
            const mimeType = part.mimeType;
            const isCV = mimeType === 'application/pdf' || 
                        mimeType === 'application/msword' ||
                        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            
            if (isCV) {
              attachments.push({
                filename: part.filename,
                mimeType: part.mimeType,
                size: part.body.size || 0,
                attachmentId: part.body.attachmentId
              });
            }
          }
          
          if (part.parts) {
            extractAttachments(part.parts);
          }
        });
      };

      extractAttachments([data.payload]);

      if (attachments.length === 0) {
        return null;
      }

      return {
        id: data.id,
        threadId: data.threadId,
        subject,
        from,
        date: new Date(date).toISOString(),
        snippet: data.snippet || '',
        attachments,
        hasAttachments: true
      };
    } catch (error) {
      console.error('[Gmail] Error getting email details:', error.message);
      return null;
    }
  }

  async getAttachment(partnerId, messageId, attachmentId) {
    const gmail = await this.getGmailClient(partnerId);
    
    const { data } = await gmail.users.messages.attachments.get({
      userId: 'me',
      messageId: messageId,
      id: attachmentId
    });

    const buffer = Buffer.from(data.data, 'base64url');
    return buffer;
  }

  async disconnect(partnerId) {
    const gmailToken = await GmailToken.findOne({ partnerId });
    
    if (gmailToken) {
      try {
        this.oauth2Client.setCredentials({
          access_token: gmailToken.getAccessToken()
        });
        await this.oauth2Client.revokeCredentials();
      } catch (error) {
        console.error('[Gmail] Error revoking token:', error.message);
      }
      
      await GmailToken.deleteOne({ partnerId });
    }
  }

  async getStatus(partnerId) {
    const gmailToken = await GmailToken.findOne({ partnerId });
    
    if (!gmailToken) {
      return { connected: false, email: null };
    }

    return {
      connected: true,
      email: gmailToken.email
    };
  }
}

module.exports = new GmailService();
