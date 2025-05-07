"use client";

export default function Card({ title, tag }: { title: string, tag: string }) {
    return (
        <div className="bg-white p-3 rounded-md shadow mb-3">
            <div className="text-sm font-semibold mb-1">{title}</div>
            <div className="text-[10px] text-purple-600 font-bold bg-purple-100 w-fit px-2 py-0.5 rounded">{tag}</div>
        </div>
    );
}