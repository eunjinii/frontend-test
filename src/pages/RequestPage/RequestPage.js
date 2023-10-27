import React, { useEffect, useState, useCallback } from 'react';
import axios from "axios"
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { GOOGLE_STATUS_CODE } from '../../utils/common'
import './RequestPage.css';
import DmsCoordinates, { parseDms } from "dms-conversion";

const BASE_URL = 'https://maps.googleapis.com/maps/api/streetview'
const API_KEY = process.env.REACT_APP_API_KEY;
const GOOGLE_SIGNATURE = process.env.REACT_APP_GOOGLE_SIGNATURE
const NUM_HEADINGS = 6

const RequestPage = () => {
    const [imageUrlList, setImageUrlList] = useState([]);
    const [imageBlobList, setImageBlobList] = useState([]);
    const [params, setParams] = useState({
        latitude: "37.3699606",
        longitude: "127.10561282466772",
        heading: 360
    })

    useEffect(() => {
        fetchMetaData()
    }, []);

    const requestParams = {
        location: `${params.latitude},${params.longitude}`,
        size: '600x600',
        key: encodeURIComponent(API_KEY),
        // signature: encodeURIComponent(GOOGLE_SIGNATURE),
        heading: params.heading,
        fov: 90, // default 90, max 120, 수평 시야 왼쪽: fov=120, 오른쪽: fov=20
        pitch: 0, // default 0, 카메라의 위 또는 아래 각도
        return_error_code: true
    }

    const fetchGoogleData = async () => {
        setImageUrlList([])
        let payload = {
            params: requestParams,
            headers: { "Content-Type": "image/jpeg" },
            responseType: 'blob'
        }
        let requestParamsList = [];
        for (let i = 0; i < NUM_HEADINGS; i++) {
            const unitAngle = 360 / NUM_HEADINGS;
            requestParamsList.push({ ...requestParams, heading: (params.heading + unitAngle * i) % 360 })
        }
        try {
            const requestList = requestParamsList.map(params => axios.get(BASE_URL, { ...payload, params }))
            const responseList = await axios.all(requestList)
            const dataList = responseList.map((res) => res.data)
            setImageBlobList(dataList) // blob[] 
            renderImage(dataList)
            // console.log(dataList)
        } catch (e) {
            console.error(e)
        }
    }

    const fetchMetaData = async () => {
        try {
            const res = await axios.get(`${BASE_URL}/metadata`, { params: requestParams })
            if (res.data.status !== "OK") {
                const alertMessage = GOOGLE_STATUS_CODE[res.data.status];
                throw new Error(alertMessage)
            }
        } catch (e) {
            console.error(e)
            alert(e.message)
        } finally {
            await fetchGoogleData()
        }
    }

    const downloadImages = async () => {
        const zip = new JSZip()
        imageBlobList.forEach((imgBlob, i) => {
            console.log(imgBlob)
            zip.file(`img_${i}.jpg`, imgBlob, { binary: true });
        })
        zip.generateAsync({ type: "blob" }).then((blob) => {
            saveAs(blob, 'test.zip');
        })
    }

    const readFileAsync = (blob) => {
        return new Promise((res, _) => {
            const reader = new FileReader();
            reader.readAsDataURL(blob)
            reader.onload = (e) => {
                res(String(e.target?.result))
            }
        })

    }

    const renderImage = async (blobList) => {
        const imgList = await Promise.all(blobList.map(readFileAsync))
        setImageUrlList(imgList)
    }

    const handleChange = e => {
        setParams({
            ...params,
            [e.target.name]: e.target.value,
        })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        await fetchMetaData()
    }

    return (
        <div className='request-page-container'>
            <form className='form-container' onSubmit={handleSubmit}>
                <div className='form-input-container'>
                    <label name="latitude">latitude(위도)</label>
                    <input
                        type="text"
                        name="latitude"
                        value={params.latitude}
                        onChange={handleChange}
                    />
                </div>
                <div className='form-input-container'>
                    <label name="longitude">longitude(경도)</label>
                    <input
                        type="text"
                        name="longitude"
                        value={params.longitude}
                        onChange={handleChange}
                    />
                </div>
                <div className='form-input-container'>
                    <label name="heading">heading(방향 각도)</label>
                    <input
                        type="text"
                        name="heading"
                        value={params.heading}
                        onChange={handleChange}
                    />
                </div>

                <button className=' coords' type="button" onClick={() => { window.open('https://earth.google.com/web/@37.37006789,127.10550979,44.22072737a,475.14787922d,35y,-0h,0t,0r/data=OgMKATA') }}>Find coords</button>
                <button className=' request' type="submit">Request GSV images</button>
            </form>

            <ul className='image-container'>
                {imageUrlList.length > 0 ? imageUrlList.map((imageUrl, i) => (
                    <img className='image-item' src={imageUrl} alt="GSV Image" key={i} />

                )) : <img src='#' alt="GSV Image" />}
            </ul>

            <div className='button-container'>
                <button type="button" onClick={downloadImages}>Download zip</button>
            </div>

        </div>
    );
};

export default RequestPage;