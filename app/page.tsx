import FileUploader from "@/components/FileUploader";
import ChatWindow from "@/components/ChatWindow";


export default function Home() {
  const userId = "dev-user"; 

  return (
    <main className="min-h-screen p-4 md:p-8 bg-[#111111] text-gray-100 font-sans flex items-center justify-center">
      <div className="w-full max-w-6xl mx-auto glass-panel p-6 md:p-10 my-4 border-t-2 border-t-white">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-[#333] pb-4 mb-10 gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-widest uppercase mb-1">
              SEMANTIC CONTROLLER V1.2
            </h1>
            <p className="text-xs font-mono text-gray-500 tracking-widest uppercase">
              COGNITIVE DYNAMICS LAB // KNOWLEDGE BASE
            </p>
          </div>
          <div className="text-xs font-mono tracking-widest text-gray-400 border border-[#333] px-3 py-1 self-start md:mt-1">
            STATUS // ONLINE
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
          <div className="lg:col-span-1 h-full">
            <FileUploader userId={userId} />
          </div>
          <div className="lg:col-span-2 h-full">
            <ChatWindow userId={userId} />
          </div>
        </div>
      </div>
    </main>
  );
}
