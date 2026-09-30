// src/services/mockApi.js
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const mockBotApi = {
    sendMessage: async (text) => {
        await delay(1000); // Simulate API delay
        return {
            response: `Mock response to: ${text}\n\nThis is a simulated response for testing the UI. You asked about: ${text}\n\nSuggested migration strategy:\n1. Analyze current system\n2. Plan migration steps\n3. Execute migration`
        };
    },

    uploadImage: async (file, text) => {
        await delay(1500);
        return {
            response: `Analyzed image: ${file.name}\n${text ? `Context: ${text}\n` : ''}\nMock image analysis response with migration recommendations...`
        };
    }
};
