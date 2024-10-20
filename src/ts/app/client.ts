import {DirList, Entry} from "./api";

doIt().then(() => {
    console.log('done!')
})

async function doIt() {
    const newdirButton = document.getElementById('newdir-submit')
    newdirButton.onclick = async () => {
        await newDir()
    }
    await updateLists()
}

async function newDir() {
    const nameField = document.getElementById('newdir-name')
    const dirname = nameField.value
    console.log(`New directory name: ${dirname}`)
    let res = await fetch(`/mkdir/?dir=${encodeURI(dirname)}`, {
        method: "POST",
    })
    let lists: DirList[] = await res.json()
    writeToList(lists[1])
}

// XXX: This is a bad name
async function cdFromList(newdir: string) {
    console.log(`cd to ${newdir}`)
    let res = await fetch(`/cd/from?dir=${encodeURI(newdir)}`, {
        method: "POST",
    });
    let lists: DirList[] = await res.json();
    console.log(`cd complete. Updating from list...`)
    writeFromList(lists[0])
    console.log(`done updating from list.`)
}

async function cdToList(newdir: string) {
    let res = await fetch(`/cd/to?dir=${encodeURI(newdir)}`, {
        method: "POST",
    })
    let lists: DirList[] = await res.json()
    console.log(`cd complete. Updating to list...`)
    writeToList(lists[1])
    console.log('done updating to list.')
}

async function updateLists() {
    const res = await fetch('/list/')
    const lists: DirList[] = await res.json()
    writeFromList(lists[0])
    writeToList(lists[1])
}

function writeToList(theList: DirList) {
    const breadcrumb = document.getElementById('to-list-breadcrumb')
    breadcrumb.innerText = theList.breadcrumb

    const widget = document.getElementById('to-list')
    widget.innerText = ""
    for (const e of sortEntries(theList.entries)) {
        const a = document.createElement('a')
        a.classList.add('list-group-item')
        if (e.directory) {
            a.classList.add('list-group-item-action')
            a.classList.add('as-list-view-dir')
            a.onclick = async () => {
                await cdToList(e.name)
            }
        } else if (e.name.endsWith('.AKP')) {
            a.classList.add('list-group-item-action')
            a.classList.add('as-list-view-program')
        } else {
            a.classList.add('disabled')
            a.ariaDisabled = "true"
        }
        a.innerText = e.name
        widget.appendChild(a)
    }
}

// XXX: Big dumb kluge


function writeFromList(theList: DirList) {
    const breadcrumb = document.getElementById('from-list-breadcrumb')
    breadcrumb.innerText = theList.breadcrumb

    const widget = document.getElementById('from-list')
    widget.innerText = ""
    for (const e of sortEntries(theList.entries)) {
        const item = document.createElement('li')
        item.classList.add('list-group-item')
        item.classList.add('list-group-item-action')
        item.classList.add('justify-content-between')
        item.classList.add('align-items-center')
        item.classList.add('d-flex')
        item.innerText = e.name + ` `
        if (e.directory) {
            item.classList.add('as-list-view-dir')
            item.onclick = async () => {
                await cdFromList(e.name)
            }
        } else if (e.name.endsWith('.xpm')) {
            item.classList.add('mpc-program')
            item.classList.add('as-list-view-program')
            const badge = document.createElement('i')
            badge.classList.add('material-icons')
            badge.innerText = 'arrow_forward'
            item.appendChild(badge)
            item.onclick = async () => {
                await transformProgram(e.name)
            }
        } else {
            item.classList.add('disabled')
            item.ariaDisabled = "true"
        }
        widget.appendChild(item)
    }
}

async function transformProgram(programName) {
    const res = await fetch(`/program/translate?name=${encodeURI(programName)}`, {
        method: "POST"
    })
    console.log(`Transform complete.`)
    const lists = await res.json()
    writeToList(lists[1])
}

function sortEntries(entries: Entry[]) {
    let rv = []
    for (const e of entries) {
        rv.push(e)
    }

    rv = rv.sort((a, b) => {
            const aName = a.name
            const bName = b.name
            if (aName === '..') {
                return -1
            } else if (bName === '..') {
                return 1
            } else if (a.directory && b.directory) {
                return aName - bName
            } else if (a.directory) {
                return -1
            } else if (b.directory) {
                return 1
            } else if (aName.endsWith('.xpm') && bName.endsWith('.xpm')) {
                return aName - bName
            } else if (aName.endsWith('.xpm')) {
                return -1
            } else if (bName.endsWith('.xpm')) {
                return 1
            } else if (aName.endsWith('.AKP') && bName.endsWith('.AKP')) {
                return aName - bName
            } else if (aName.endsWith('.AKP')) {
                return -1
            } else if (bName.endsWith('.AKP')) {
                return 1
            } else {
                return aName - bName
            }
        }
    )

    return rv
}