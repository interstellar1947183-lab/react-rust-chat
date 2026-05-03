import React,{useState} from 'react'

const NamePrompt = ({vis,name,setName,setVis}) =>{
    
    const submitName = (e) => {
        e.preventDefault();
        if(name == ""){
            return;
        }

        setVis(false)
    }

    return(
        <div className = {vis ? `z-40 transition-all flex flex-col justify-center items-center h-screen w-screen absolute backdrop-blur-xl`: `transition-all hidden flex flex-col justify-center items-center h-screen w-screen absulte backdrop-blur-xl`}>
        <div className="z-50 w-4/5 h-3/5 lg:w-2/5 lg:h-2/5 bg-slate-300 flex flex-col justify-center items-center rounded-xl shadow-md">
        <form className="flex gap-4 flex-col items-center" onSubmit={(e) =>submitName(e)}>
            <p className="text-lg lg:text-2xl">Hi there! What's your Name?</p>
            <input type="text" className="px-5 py-2 rounded-xl required" value={name} onInput={(e)=> setName(e.target.value)} />
            <button type="submit" className="text-gray-100 bg-slate-500 px-5 py-2 rounded-xl active:translate-y-0.5 active:translate-x-0.5 hover:bg-slate-40 transition all">Submit</button>
        </form>
        </div>
        </div>
    )

}

export default NamePrompt;