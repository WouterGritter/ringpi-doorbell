import 'dotenv/config'
import {RingApi} from "ring-client-api";

const Client = require('castv2-client').Client;
const DefaultMediaReceiver = require('castv2-client').DefaultMediaReceiver;

(async () => {
    console.log('Hello, world!');
    console.log(`Ring refresh token: ${process.env.RING_REFRESH_TOKEN.substring(0, 8)}...`);
    console.log(`Nest mini IP: ${process.env.NEST_MINI_HOST}`);
    console.log(`Chime mp3 URL: ${process.env.CHIME_URL}`);

    console.log('Connecting to ring api..');
    const ringApi = new RingApi({refreshToken: process.env.RING_REFRESH_TOKEN});
    console.log('Connected to ring api.');

    const cameras = await ringApi.getCameras();
    console.log(`Found ${cameras.length} camera(s).`);

    const camera = cameras.filter(c => c.name === process.env.RING_CAMERA_NAME)[0];
    if (camera === undefined) {
        console.log('Couldn\'t find the desired ring camera.');
        process.exit(1);
    }

    console.log(`Found camera ${camera.name}. Now listening to events!`);
    let lastDingTime = new Date().getTime();
    camera.onNewNotification.subscribe(async (notification) => {
        const now = new Date().getTime();
        if (notification.subtype === 'ding' && now - lastDingTime > 5000) {
            lastDingTime = now;

            console.log(`Ding dong! (sending chime URL to nest mini at ${process.env.CHIME_URL})`);
            await playOnSpeaker(process.env.NEST_MINI_HOST, process.env.CHIME_URL);
        }
    });
})();

async function playOnSpeaker(ip: string, mp3Url: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const client = new Client();
        client.connect(ip, () => {
            client.launch(DefaultMediaReceiver, (err1: any, player: any) => {
                if (err1) {
                    reject(err1);
                    return;
                }

                const params = {
                    contentId: mp3Url,
                    contentType: 'audio/mp3',
                    streamType: 'BUFFERED'
                };

                player.load(params, { autoplay: true }, (err2: any, status: any) => {
                    if(err2) {
                        reject(err2);
                        return;
                    }

                    resolve(status);
                });
            });
        });
    });
}
