
import { useAddAccount } from '@/hooks/use-tracking';
import { useState } from 'react';

interface AddAccountFormProps {
    guildId: string;
}

export function AddAccountForm({ guildId }: AddAccountFormProps) {
    const [username, setUsername] = useState('');
    const addAccount = useAddAccount(guildId);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        addAccount.mutate({ username });
        setUsername('');
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-xl font-semibold">Add Account</h2>
            <div>
                <label htmlFor="username" className="block text-sm font-medium">
                    Username
                </label>
                <input
                    type="text"
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
            </div>
            <button
                type="submit"
                disabled={addAccount.isPending}
                className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
                {addAccount.isPending ? 'Adding...' : 'Add Account'}
            </button>
        </form>
    );
}
