import { QuizTest } from "@/components/quiz-test"

export default function TestPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <h1 className="text-4xl font-bold text-center mb-8">刷题功能测试页面</h1>
        <QuizTest />
      </div>
    </div>
  )
}
