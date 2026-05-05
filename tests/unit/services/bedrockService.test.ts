export {};

/**
 * Unit tests for BedrockService
 */

const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const { analyzeNetworks, testConnection } = require('../../../server/src/services/bedrockService');
const { getAwsRegion } = require('../../../server/src/services/awsService');

// Mock AWS SDK
jest.mock('@aws-sdk/client-bedrock-runtime');
// Mock awsService
jest.mock('../../../server/src/services/awsService', () => ({
  getAwsRegion: jest.fn(),
}));
// Mock logger
jest.mock('../../../server/src/logging/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

describe('BedrockService', () => {
  let mockSend: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSend = jest.fn();
    (BedrockRuntimeClient as jest.Mock).mockImplementation(() => ({
      send: mockSend,
    }));
    (getAwsRegion as jest.Mock).mockResolvedValue('us-east-1');
  });

  describe('analyzeNetworks', () => {
    it('should successfully analyze networks and parse response', async () => {
      const networks = [{ bssid: 'AA:BB:CC:DD:EE:FF', ssid: 'TestNet', threat_score: 75 }];
      const userQuestion = 'Is this a threat?';

      const mockResponse = {
        body: Buffer.from(
          JSON.stringify({
            content: [
              {
                text: 'Analysis: This looks like a threat.\nSuggestions:\n1. Investigate BSSID AA:BB:CC:DD:EE:FF\n2. Check for signal anomalies',
              },
            ],
          })
        ),
      };

      mockSend.mockResolvedValueOnce(mockResponse);

      const result = await analyzeNetworks(networks, userQuestion);

      expect(result.analysis).toBe('This looks like a threat.');
      expect(result.suggestions).toEqual([
        'Investigate BSSID AA:BB:CC:DD:EE:FF',
        'Check for signal anomalies',
      ]);
      expect(mockSend).toHaveBeenCalled();
    });

    it('should handle missing suggestions section', async () => {
      const networks = [{ bssid: 'AA:BB:CC:DD:EE:FF' }];
      const mockResponse = {
        body: Buffer.from(
          JSON.stringify({
            content: [{ text: 'Analysis: Only analysis here.\nSuggestions:' }],
          })
        ),
      };
      mockSend.mockResolvedValueOnce(mockResponse);

      const result = await analyzeNetworks(networks, 'question');
      expect(result.analysis).toBe('Only analysis here.');
      expect(result.suggestions).toEqual([]);
    });

    it('should throw error on empty response', async () => {
      mockSend.mockResolvedValueOnce({ body: Buffer.from(JSON.stringify({ content: [] })) });
      await expect(analyzeNetworks([], 'q')).rejects.toThrow('Empty response from Bedrock');
    });

    it('should summarize networks correctly (internal summarizeNetworks logic)', async () => {
      const networks = [
        {
          bssid: 'AA:BB',
          ssid: 'S1',
          type: 'W',
          threat_score: 10,
          observation_count: 5,
          unique_days: 2,
          seen_at_home: true,
        },
        { bssid: 'CC:DD', seen_away: true },
      ];
      mockSend.mockResolvedValueOnce({
        body: Buffer.from(
          JSON.stringify({ content: [{ text: 'Analysis: OK\nSuggestions:\n1. S' }] })
        ),
      });

      await analyzeNetworks(networks, 'q');

      const lastCall = (InvokeModelCommand as unknown as jest.Mock).mock.calls[0][0];
      const body = JSON.parse(lastCall.body);
      const prompt = body.messages[0].content;

      expect(prompt).toContain('BSSID=AA:BB');
      expect(prompt).toContain('SSID="S1"');
      expect(prompt).toContain('score=10');
      expect(prompt).toContain('obs=5');
      expect(prompt).toContain('days=2');
      expect(prompt).toContain('seen@home');
      expect(prompt).toContain('seen@away');
    });
  });

  describe('testConnection', () => {
    it('should return true when connection is successful', async () => {
      mockSend.mockResolvedValueOnce({ body: Buffer.from('{}') });
      const result = await testConnection();
      expect(result).toBe(true);
    });

    it('should return false when connection fails', async () => {
      mockSend.mockRejectedValueOnce(new Error('AWS Error'));
      const result = await testConnection();
      expect(result).toBe(false);
    });
  });
});
