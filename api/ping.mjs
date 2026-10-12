export default {
    async fetch(request) {
        return new Response('pong', {
            headers: {
                'Content-Type': 'text/plain',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
};
