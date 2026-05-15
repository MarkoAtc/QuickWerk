import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';

import MessengerScreen from '../src/features/booking/messenger-screen';

const initialThread = [
  {
    direction: 'inbound',
    body: 'Hi, I am on the way and should be there in around 20 minutes.',
    meta: 'Provider • 11:20',
  },
  {
    direction: 'outbound',
    body: 'Perfect, thanks. The access code is already in the booking notes.',
    meta: 'You • 11:23',
  },
  {
    direction: 'inbound',
    body: 'Great, I will confirm once the job is completed.',
    meta: 'Provider • 11:24',
  },
];

export default function MessengerRoute() {
  const params = useLocalSearchParams();
  const bookingId = Array.isArray(params.bookingId) ? params.bookingId[0] : params.bookingId;
  const counterpartLabel = Array.isArray(params.counterpartLabel) ? params.counterpartLabel[0] : params.counterpartLabel;
  const counterpartValue = Array.isArray(params.counterpartValue) ? params.counterpartValue[0] : params.counterpartValue;
  const headlineParam = Array.isArray(params.headline) ? params.headline[0] : params.headline;

  const initialContextThread = useMemo(
    () => [
      {
        direction: 'inbound',
        body: `Hi, this is your ${counterpartLabel?.toLowerCase() || 'counterpart'}. I am following up on booking ${bookingId || 'current'}.`,
        meta: `${counterpartValue || counterpartLabel || 'Counterpart'} • 11:20`,
      },
      ...initialThread,
    ],
    [bookingId, counterpartLabel, counterpartValue],
  );

  const [thread, setThread] = useState(initialContextThread);
  const [composerValue, setComposerValue] = useState('');

  const handleSend = () => {
    if (!composerValue.trim()) {
      return;
    }

    setThread((previous) => [
      ...previous,
      {
        direction: 'outbound',
        body: composerValue.trim(),
        meta: 'You • just now',
      },
    ]);
    setComposerValue('');
  };

  return (
    <MessengerScreen
      headline={headlineParam || 'Booking conversation'}
      subheadline={`Keep communication structured, visible, and directly attached to booking ${bookingId || 'context'}.`}
      bookingMeta={`Booking ID: ${bookingId || 'n/a'} • ${counterpartLabel || 'Counterpart'}: ${counterpartValue || 'not provided'}`}
      guidance="This is currently the first polished messaging layer in the flow. Booking context is already attached, while full live syncing can be added once backend messaging is introduced."
      thread={thread}
      composerValue={composerValue}
      onComposerChange={setComposerValue}
      onSend={handleSend}
    />
  );
}
