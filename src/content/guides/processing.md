---
title: "Processes, Threads, and How Servers Handle Work"
description: "From programs on disk to processes, CPU scheduling, context switches, and threads, with the connection to Node.js and libuv."
category: "JavaScript"
topic: "engines-and-runtimes"
order: 1
readTime: "14 min read"
date: "September 2026"
publishedAt: "2026-09-07"
---

# Processes, Threads, and How Servers Handle Work

When we work on complex backend systems, there might be a chance that the type of product we are working with has different use cases.

Systems like Netflix and on-demand streaming systems like Hotstar have an important use case: serving a lot of requests that actually come to their platforms.

But these systems also need a lot of processing power. If someone uploads a movie on Netflix, Netflix might take the video and process it in different resolutions.

The scenario is that when we look at backend systems, it is not only about catering to requests. There might be a chance that a lot of CPU-intensive processing is required.

In order to be a successful backend engineer, it is essential to understand how the programs that we write execute on our machines. We also need to understand how computers are able to run so many tasks internally and the concept of threads. We need to understand these to also know about libuv.

## How a Program Becomes a Process

Let's think about how exactly computers run software.

There might be a company where you work as a developer and write some code. This code might be in a specific programming language. Now you try to save this code on an HDD/SSD in the form of a file. This file is referred to as a program.

What happens when we try to run the program depends on the type of ecosystem. For example, C++ code will be compiled to create an executable binary, which we then run. For JavaScript, there will be a JavaScript engine handling it.

```text
Program on disk
       │
       ▼
Start execution
       │
       ▼
Running process
```

With some mechanism, we will try to run the program. What actually happens is that it becomes something called a process.

## What Is a Process?

A program under execution is a process. It is technically loaded into your RAM. The program we write stays on the HDD, while the process stays in RAM. A process is a complete entity in the OS.

The process has a lot of important information. You might have heard about the call stack. The process contains the call stack, heap memory, and a few more things, for example, a text area (where the actual instructions are stored).

It also has some space for static and global variables, a process ID, a program counter, and a state.

A PCB (process control block) is also created when we create a process. It contains all the information about the process. It is used by the OS to manage the process.

The program counter is a CPU register while the code runs. The OS saves its value when switching away, so execution can resume later. The process ID and state are part of the OS bookkeeping, often described as the PCB.

## CPU Cores

A very interesting question: who is responsible for executing the instructions that software is expected to execute?

The CPU.

One CPU can have many cores. Each core is a single computing unit.

So when we talk about the CPU executing work, we are talking about its cores doing that work. Dual-core means one CPU with two physical cores.

## A Single Core and Multitasking

How does a single-core CPU work?

It works in the same way as if your company had a single employee.

Before multicore CPUs became common, many people used single-core computers.

Still, on those older Windows computers, people were able to multitask with a single-core CPU.

How was a single-core CPU able to multitask?

The task in multitasking is the process that is being executed by the CPU.

For these examples, assume each process has one thread, meaning one path of execution. We are also leaving Hyper-Threading aside for now. We will come back to both kinds of threads later.

So, actually, at a single instant in time, a core can only execute a single process.

At any point in time, a single core in this example can only execute one of our processes. The processes need to take turns.

## Instructions and the Program Counter

How exactly does a task run?

Whatever your task is, you run it and it gets loaded as a process in memory. It contains the piece of code that needs to be executed.

There is something called a program counter. It is a register that keeps track of the current instruction being executed.

A register is a small, fast storage location in the CPU that holds data temporarily.

In simple terms, a program counter points to the exact instruction that your CPU core is going to execute at that instant in time.

We are talking about machine code here, by the way. Do not get confused.

A modern CPU core can overlap work on several instructions. But in our example, it is still following one process's execution path at a time.

But the chip companies said, "We do multitasking."

How were CPUs able to do that?

## Running Processes to Completion

What if we were to design it?

One way to do it is this: suppose we have to run 3 processes. You start executing process p1 at t=0 and keep executing it until it finishes. Then you move on to p2 and so on. This is a FIFO structure in the sense that we complete the instructions of a process.

```text
Time ─────────────────────────────►
CPU: [ P1 until finished ][ P2 ][ P3 ]
```

But this is problematic. Why?

The software that we use is generally not implemented in a way where it has something to do, completes it, and that's it.

If you make one process run completely, then the other processes will have to wait for it to finish before they can start. This is not a good thing.

Also, instructions are read address by address, not necessarily top to bottom. Even source code can jump between paths through loops, branches, and function calls.

## Context Switching

There is a concept called context switching.

With context switching, let's say you have to run processes p1, p2, and p3. What is the CPU going to do?

A CPU can execute an enormous number of instructions in 1 second. The exact number depends on the CPU and the work it is doing. An instruction can be as small as adding two numbers or loading a value from memory.

How about we allocate some milliseconds to process 1, then do a context switch (you're doing something else)? We start executing some instructions from process p2, then move to process p3 and so on. Then we go back to p2 and so on.

Within a complete time frame of 1 second, you divide the time into smaller time frames. You execute each process for a certain amount of time before moving on to the next one.

```text
Time ─────────────────────────────►
CPU: [ P1 ][ P2 ][ P3 ][ P1 ][ P2 ]
       execute       then resume
```

This sharing of CPU time uses context switching. At each switch, the OS saves the outgoing execution state and restores the incoming one.

How does the system choose which process to run next? The OS has a scheduler that uses CPU scheduling algorithms for this.

Now think about it: CPUs can get through a lot of work in 1 second. They execute instructions and switch between processes so fast that we often won't notice the context switch.

That is the trick that CPUs actually play: a single core relies on context switching (allocating your CPU to a single process).

The saved program counter helps the process resume at the appropriate instruction.

## Process State

So while p1 is running, what is happening to p2 and p3? That brings us to process state.

The state technically refers to what is happening to the process. If we are running p1 and p2 and p3 only need CPU time, they are ready, waiting for their turn. P1's state is running.

Waiting for disk input is different. That process is blocked until the input is available.

## Why Switching Helps

What is the benefit of this whole approach?

Suppose p1 wants to read something from an HDD. It is an expensive operation, and since an HDD is secondary memory, it is slow. If we used the first approach, our CPU might have been blocked by p1.

That is why the context-switching approach is good.

## Multiple Cores and Multiprocessing

But if your machine has multiple cores, then this same approach would be used for the cores as well. Four cores execute four processes simultaneously.

This is called multiprocessing.

What we did with context switching is multitasking.

Actual parallel processing needs work executing at the same time. Multiple processes can do that across cores, but threads within one process can do it too.

Remember our example: one thread per process, with Hyper-Threading left aside. If we have 8 cores and 9 ready processes, some processes must take turns through context switching.

That is the pigeonhole principle.

## Client-Server Architecture

Suppose we open Facebook and, just like us, multiple people open Facebook and want to like a post. Facebook must have the logic for how a user likes a post written somewhere. If multiple people hit the Facebook system and want to like a post simultaneously, how will this be handled?

Let's understand client-server architecture.

A client is any process running on a machine that raises a request for a particular task. A client can be anything: an app on your phone, the browser on your computer, etc. A client doesn't always mean a user interface.

A server is a process running on a machine that can accept a request from a client, process it, and send a response back.

The Facebook app on the phone will be the client. From there, we will communicate with machines owned by Facebook where some processes are running. They process the request and give a response.

```text
Phone app ──┐
Browser ────┼── requests ──► Server process
Other app ──┘                    │
                                 └── responses
```

Whenever a client raises a request, how does the server handle it? There can be millions of clients making this request. Will it do it one by one? No.

And here, we are talking about a particular type of server.

## A Process for Each Request

Servers have different ways of handling requests. In this particular model, the server creates a separate process to handle each request.

In earlier days, a server used to create a new process for every request. If it is a single-core CPU, then context switching will happen for every request.

To handle more requests, we will upgrade the hardware to an octa-core CPU, but the problem still remains. Creating a brand-new process is an expensive task. Why?

Because processes contain a lot of information and require RAM allocation. Running so many processes also needs more RAM. So creating a fresh process for every request can become a scaling problem.

## Hardware Threads

So creating a whole process for every request can get expensive. Could threads help here? Before we get to that, let's clear up something about the word "thread."

Now, have you seen the term "total threads" on a CPU specification page from Intel?

On that page, threads mean hardware execution contexts, also called logical processors. They are not additional physical cores.

Some Intel CPUs have two types of cores: efficiency and performance. Whether a core supports Hyper-Threading depends on the CPU model.

With Hyper-Threading enabled, a supported core exposes two logical processors. These can run two software threads while sharing the physical core's execution resources.

These hardware threads and the software threads we will talk about are different. The OS schedules software threads onto logical processors.

## Software Threads

Now let's come back to the threads our program can create. How can they help with the cost of creating processes?

Threads are paths of execution inside a process. They are often described as lightweight processes.

Why lightweight? Let's look at what happens when we create threads.

We have a process p. It can spawn a lot of threads inside that same process. Now, let's look at what we are counting.

If we have a single CPU core with a process running and it creates 3 threads, how many processes are running? Still one process. Assuming it started with one thread, it now has 4 threads: the original thread and the 3 new ones.

Did we create more CPU cores? No. We still have one core. With Hyper-Threading left aside, those 4 threads take turns through context switching.

One benefit is that they are lightweight, as creating threads is generally less expensive than creating a process.

Why is this lightweight? Because to create a thread, we do not do everything we do to create a process. Since a thread is created by a process, it shares a lot of memory resources with the process that created it.

When will the process spawn a thread? We give instructions for it.

Because threads share a lot of resources with the parent process, they need less duplication. But if they change the same data, we need to coordinate those changes.

Let's say the parent process p is written in Java, and the Java code has 2 functions, f1 and f2. On a single CPU core, we load the program as process p. There is no provision to run the functions f1 and f2 in parallel.

So, on a single CPU core, we can run 2 smaller or lightweight threads, t1 and t2. They run f1 and f2 concurrently, so f1 will only run in t1 and so on.

To create a thread, we need a process.

## Shared Resources and Thread State

We have said that threads share resources. But what exactly do they share, and what does each thread still need for itself?

Whenever we create a new process, we set up its heap memory and stack memory. We also set up saved execution state, including register values and a program counter.

Remember how we paused p1 and came back to it later? That saved state is what lets execution pick up where it left off.

But for a thread, we do not need to create new heap memory, space for global variables, a text section, etc.

But we still create new stack memory and saved execution state for the thread. Its register values and program counter are loaded into the CPU when it runs.

Threads work like this: there is a shared text section, and every thread has its own program counter and stack memory. The program counter of t1 can point somewhere different from that of t2. The stack memory of each will be different.

If function f1 is running on t1 and the same function f1 is running on t2, their local variables will be different. So you can execute logic differently. Also, a thread can spawn another process depending on the programming language interface.

## Threads or Processes for Requests

```text
Process address space
├── Shared code, globals, and heap
├── Thread T1 stack
└── Thread T2 stack

T1: its own execution position and register state
T2: its own execution position and register state
```

Now, let's go back to our server. We wanted to handle many requests without paying the cost of a whole new process each time.

Should we spawn more threads or processes? For the server model we are discussing, threads can reduce the cost of handling requests concurrently. We can also reuse a pool of threads or processes instead of creating one for every request.

Does Node.js create a thread for every request? No. It uses an event loop and a small number of threads to handle many clients. That is where these concepts will help us understand libuv.
