/**
 * Enhanced utility functions for formatting AI responses across all components
 */

/**
 * Clean LLM response formatter with proper heading hierarchy
 */
export const formatLLMResponse = (text: string | null | undefined): string => {
  if (!text) return '';
  
  return text
    // Convert links to anchors first
    .replace(/\bhttps?:\/\/[^\s)]+(?=\)|$)/g, '<a href="$&" target="_blank" rel="noopener noreferrer" style="color: #0073bb; text-decoration: underline;">$&</a>')
    // Remove standalone # and ## on their own lines
    .replace(/^#{1,2}\s*$/gm, '')
    .replace(/<br>#{1,2}<br>/g, '<br>')
    .replace(/#{1,2}<br>/g, '')
    
    // Main headers (##)
    .replace(/^## (.+)$/gm, '<h1 style="color: #232f3e; font-size: 28px; font-weight: 800; margin: 12px 0 8px 0; border-bottom: 4px solid #0073bb; padding-bottom: 6px; text-transform: uppercase;">$1</h1>')
    
    // Section headers (#)
    .replace(/^# (.+)$/gm, '<h2 style="color: #0073bb; font-size: 22px; font-weight: 700; margin: 10px 0 6px 0; background: #f8f9fa; padding: 6px 10px; border-left: 5px solid #0073bb; border-radius: 4px;">$1</h2>')
    
    // Subsection headers (###)
    .replace(/^### (.+)$/gm, '<h3 style="color: #232f3e; font-size: 18px; font-weight: 700; margin: 8px 0 4px 0; border-bottom: 2px solid #e1e4e8; padding-bottom: 2px;">$1</h3>')
    
    // Content detail headers (####) - Dark blue colored
    .replace(/^#### (.+)$/gm, '<h4 style="color: #1a365d; font-size: 16px; font-weight: 600; margin: 6px 0 3px 0;">$1</h4>')
    
    // Bold text
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #0073bb; font-weight: 700; font-size: 15px;">$1</strong>')
    
    // Bullet points with dash
    .replace(/^- (.+)$/gm, '<div style="margin: 2px 0; padding-left: 16px; position: relative; line-height: 1.3;"><span style="position: absolute; left: 0; color: #0073bb; font-weight: bold; font-size: 14px;">•</span><span style="color: #232f3e;">$1</span></div>')
    
    // Bullet points with bullet symbol
    .replace(/^•(.+)$/gm, '<div style="margin: 2px 0; padding-left: 16px; position: relative; line-height: 1.3;"><span style="position: absolute; left: 0; color: #0073bb; font-weight: bold; font-size: 14px;">•</span><span style="color: #232f3e;">$1</span></div>')
    
    // Code blocks
    .replace(/```([\s\S]*?)```/g, '<pre style="background: #f6f8fa; border: 1px solid #e1e4e8; border-radius: 4px; padding: 12px; margin: 12px 0; overflow-x: auto; font-family: monospace; font-size: 13px;"><code>$1</code></pre>')
    
    // Inline code
    .replace(/`([^`]+)`/g, '<code style="background: #f1f3f4; padding: 2px 4px; border-radius: 3px; font-family: monospace; font-size: 13px; color: #d73a49;">$1</code>')
    
    // Clean up multiple line breaks
    .replace(/\n{3,}/g, '<br>')
    .replace(/\n\n/g, '<br>')
    .replace(/\n/g, '<br>');
};

/**
 * Format response specifically for Personal Bot
 */
export const formatBotResponse = (text: string): string => {
  return formatLLMResponse(text);
};

/**
 * Add custom CSS for clean styling
 */
export const addCustomStyles = (): void => {
  if (document.getElementById('idma-custom-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'idma-custom-styles';
  style.textContent = '\n    .idma-response {\n      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;\n      line-height: 1.6;\n      color: #232f3e;\n    }\n  ';
  document.head.appendChild(style);
};

/**
 * Convert plain text links to clickable HTML anchors
 */
export const convertLinksToAnchors = (text: string | null | undefined): string => {
  if (!text) return '';
  const urlRegex = /\bhttps?:\/\/[^\s)]+(?=\)|$)/g;
  return text.replace(urlRegex, '<a href="$&" target="_blank" rel="noopener noreferrer" style="color: #0073bb; text-decoration: underline;">$&</a>');
};